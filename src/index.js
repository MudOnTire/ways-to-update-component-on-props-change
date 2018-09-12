import React from 'react';
import ReactDOM from 'react-dom';

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

  componentWillReceiveProps(nextProps) {
    if (nextProps.user.id !== this.props.user.id) {
      this.setState({
        user: nextProps.user
      });
    }
  }

  setNewUserState = (newUser) => {
    this.setState({
      user: newUser
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

class App extends React.Component {
  state = {
    users: [
      { id: 0, name: 'bruce' },
      { id: 1, name: 'frank' },
      { id: 2, name: 'tony' }
    ],
    targetUser: {}
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({
        text: 'fake request'
      })
    }, 5000);
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
        <UserInput user={targetUser} onConfirm={this.onConfirm} ref='userInput' />
        {/* <FullyControlledUserInput
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
        /> */}
        {/* <FullyUncontrolledUserInput
          user={targetUser}
          onConfirm={this.onConfirm}
          key={targetUser.id}
        /> */}
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
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'));