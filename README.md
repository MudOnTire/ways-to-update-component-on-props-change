我们使用react的时候常常需要在一个组件传入的props更新时重新渲染该组件，常用的方法是在`componentWillReceiveProps`中将新的props更新到组件的state中（这种state被成为派生状态），从而实现重新渲染。React 16.3中还引入了一个新的钩子函数`getDerivedStateFromProps`来专门实现这一需求。但无论是用`componentWillReceiveProps`还是`getDerivedStateFromProps`都不是那么优雅，而且容易出错。所以今天来探讨一下这类实现会产生的问题和更好的实现方案。

## 何时使用派生状态

咱们先来看一个比较常见的需求，一个用户列表，可以新增和编辑用户，当用户点击‘新建’
按钮用户可以在输入框中输入新的用户名；当点击‘编辑’按钮的时候，输入框中显示被编辑的用户名，用户可以修改；当用户点击‘确定’按钮的时候用户列表更新。
```
class UserInput extends React.Component {

  state = {
    user: this.props.user
  }

  handleChange = (e) => {
    this.setState({
      user: {
        ...this.state.user,
        name: e.target.value
      }
    });
  }

  render() {
    const { onConfirm } = this.props;
    const { user } = this.state;
    return (
      <div>
        <input value={user.name || ''} onChange={this.handleChange} />
        <button onClick={() => { onConfirm(user) }}>确定</button>
      </div>
    );
  }
}

class App extends React.Component {
  state = {
    users: [
      { id: 0, name: 'bruce' },
      { id: 1, name: 'frank' },
      { id: 2, name: 'tony' }
    ],
    targetUser: {}
  }

  onConfirm = (user) => {
    const { users } = this.state;
    const target = users.find(u => u.id === user.id);

    if (target) {
      this.setState({
        users: [
          ...users.slice(0, users.indexOf(target)),
          user,
          ...users.slice(users.indexOf(target) + 1)
        ]
      });
    } else {
      const id = Math.max(...(users.map(u => u.id))) + 1;
      this.setState({
        users: [
          ...users,
          {
            ...user,
            id
          }
        ]
      });
    }
  }

  render() {
    const { users, targetUser } = this.state;
    return (
      <div>
        <UserInput user={targetUser} onConfirm={this.onConfirm} />
        <ul>
          {
            users.map(u => (
              <li key={u.id}>
                {u.name}
                <button onClick={() => { this.setState({ targetUser: u }) }}>编辑</button>
              </li>
            ))
          }
        </ul>
        <button onClick={() => { this.setState({ targetUser: {} }) }}>新建</button>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'));
```

运行后，效果如图：
![image](https://note.youdao.com/yws/api/personal/file/WEBf7c9073c0ad653b535bef178785a371d?method=download&shareKey=0d71b98f294065712cd549f0248767a8)


现在点击‘编辑’和‘新建’按钮，输入框中的文字并不会切换，因为点击‘编辑’和‘更新’时，虽然`UserInput`的props改变了但是并没有触发state的更新。所以需要实现props改变引发state更新，在`UserInput`中增加代码：

```
  componentWillReceiveProps(nextProps) {
    this.setState({
      user: nextProps.user
    });
  }
```

或者

```
  static getDerivedStateFromProps(props, state) {
    return {
      user: props.user
    };
  }
```

这样就实现了`UserInput`每次接收新的props的时候自动更新state。但是这种实现方式是有问题的。


## 派生状态导致的问题

首先来明确组件的两个概念：**受控数据（controlled data lives）**和**不受控数据（uncontrollered data lives）**。受控数据指的是组件中通过props传入的数据，受到父组件的影响；不受控数据指的是完全由组件自己管理的状态，即内部状态（internal state）。而派生状态揉合了两种数据源，当两种数据源产生冲突时，问题随之产生。

### 问题一

当在修改一个用户的时候，点击‘确定’按钮，输入框里的文字又变成了修改之前的文字。比如我将‘bruce’修改为‘bruce lee’，确定后，输入框中又变成了‘bruce’，这是我们不愿意看到的。

![image](https://note.youdao.com/yws/api/personal/file/WEBd2fee8a5120d9b03ec2838aa997a809f?method=download&shareKey=c4635440760bb4383e7fa8da52f4ee81)

出现这个问题的原因是，点击确定，App会re-render，App又将之前的user作为props传递给了`UserInput`。我们当然可以在每次点击确定之后将`targetUser`重置为一个空对象，但是一旦状态多了之后，这样管理起来非常吃力。

### 问题二

假设页面加载完成后，会异步请求一些数据然后更新页面，如果用户在请求完成页面刷新之前已经在输入框中输入了一些文字，随着页面的刷新输入框中的文字会被清除。

我们可以在`App`中加入如下代码模拟一个异步请求：

```
 componentDidMount() {
    setTimeout(() => {
      this.setState({
        text: 'fake request'
      })
    }, 5000);
  }
```

导致这个问题的原因在于，当异步请求完成，`setState`后`App`会re-render，而组件的`componentWillReceiveProps`会在父组件每次render的时候执行，而此时传入的`user`是一个空对象，所以`UserInput`的内容被清空了。而`getDerivedStateFromProps`调用的更频繁，会在组件每次render的时候调用，所以也会产生该问题。

为了解决这个问题我们可以在`componentWillReceiveProps`中判断新传入的user和当前的user是否一样，如果不一样才设置state：

```
  componentWillReceiveProps(nextProps) {
    if (nextProps.user.id !== this.props.user.id) {
      this.setState({
        user: nextProps.user
      });
    }
  }
```

## 更好的解决方案

派生状态的数据源的不确定性会导致各种问题，那如果每份数据有且只被一个component管理应该就能避免这些问题了。这种思路有两种实现，一种是数据完全由父组件管理，一种是数据完全由组件自己管理。下面分别讨论：

### 完全受控组件（fully controlled component）

组件的数据完全来自于父组件，组件自己将不需要管理state。我们新建一个完全受控版的`UserInput`：

```
class FullyControlledUserInput extends React.Component {
  render() {
    const { user, onConfirm, onChange } = this.props;
    return (
      <div>
        <input value={user.name || ''} onChange={onChange} />
        <button onClick={() => { onConfirm(user) }}>确定</button>
      </div>
    )
  }
}
```

App中调用`FullyControlledUserInput`的方法如下：

```
...
   <FullyControlledUserInput
      user={targetUser}
      onChange={(e) => {
        this.setState({
          targetUser: {
            id: targetUser.id,
            name: e.target.value
          }
        });
      }}
      onConfirm={this.onConfirm}
    />
...
```

现在`FullyControlledUserInput`中的所有的数据都来源于父组件，由此解决数据冲突和被篡改的问题。

### 完全不受控组件（fully uncontrolled component）

组件的数据完全由自己管理，因此`componentWillReceiveProps`中的代码都可以移除，但保留传入props来设置state初始值：

```
class FullyUncontrolledUserInput extends React.Component {
  state = {
    user: this.props.user
  }

  onChange = (e) => {
    this.setState({
      user: {
        ...this.state.user,
        name: e.target.value
      }
    });
  }

  render() {
    const { user } = this.state;
    const { onConfirm } = this.props;
    return (
      <div>
        <input value={user.name || ''} onChange={this.onChange} />
        <button onClick={() => { onConfirm(user) }}>确定</button>
      </div>
    )
  }
}
```
当传入的props发生改变时，我们可以通过传入一个不一样的`key`来重新创建一个component的实例来实现页面的更新。App中调用`FullyUncontrolledUserInput`的方法如下：：

```
<FullyUncontrolledUserInput
  user={targetUser}
  onConfirm={this.onConfirm}
  key={targetUser.id}
/>
```
大部分情况下，这是更好的解决方案。或许有人会觉得这样性能会受影响，其实性能并不会变慢多少，而且如果组件的更新逻辑过于复杂的话，还不如重新创建一个新的组件来的快。

### 在父组件中调用子组件的方法设置state

如果某些情况下没有合适的属性作为`key`，那么可以传入一个随机数或者自增的数字作为key，或者我们可以在组件中定义一个设置state的方法并通过`ref`暴露给父组件使用，比如我们可以在`UserInput`中添加：

```
  setNewUserState = (newUser) => {
    this.setState({
      user: newUser
    });
  }
```
在App中通过ref调用这个方法：

```
    ...
    
    <UserInput user={targetUser} onConfirm={this.onConfirm} ref='userInput' />
     <ul>
      {
        users.map(u => (
          <li key={u.id}>
            {u.name}
            <button onClick={() => {
              this.setState({ targetUser: u });
              this.refs.userInput.setNewUserState(u);
            }}>
              编辑
            </button>
          </li>
        ))
      }
    </ul>
    <button onClick={() => {
      this.setState({ targetUser: {} });
      this.refs.userInput.setNewUserState({});
    }}>
      新建
    </button>
    
    ...
```
这个方法不推荐使用，除非实在没法了。。
