# bitchan
Bitchan is an ethereum message board republic.


## Governance

This is a missing link of democracy in the public forum. 

### Destruction from outside forces
Having an immutable backend means not having to deal with [government thugs](https://kiwifarms.net/threads/battle-for-section-230.70375/). If you want to spin a front end up your own, the goal would be to have an easily accessible api.

### Destruction from within
Typically Benevolent Dictators For Life (BDFL), rule a website without transparency and destroy the community from within with extremely shady moderation. Strategies like [shadowbanning](https://en.wikipedia.org/wiki/Shadow_banning), [editing posts](https://web.archive.org/web/20200419171435/https://www.reddit.com/r/announcements/comments/5frg1n/tifu_by_editing_some_comments_and_creating_an/) will not be allowed.

### Vote for leaders
Moderators, Janitors, and privileged users will be voted on to represent the registered users in a democratic vote among registered users of the age of 6 months (this time will be up to debate and vote.) 

## MVP

Working user signup, single board, admin access to the contract owner.

## Roadmap

This includes tests!


### Backend Contracts on ethereum

- [x] Basic User
- [ ] Basic Client
- [ ] Basic Board
- [ ] Basic Admin control
- [ ] Governance

### Frontend client to interpret the backend state

- [ ] User Signup/Login
- [ ] Create post and reply
- [ ] Hide Post filters
- [ ] Submit application for leadership
- [ ] Submit vote for leadership


## Development

### Quick install & Run
See the [Makefile](https://github.com/vanities/bitchan/blob/master/Makefile) for more simple commands

1. Download and Install [docker](https://docs.docker.com/get-docker/)
2. Download and Install [docker-compose](https://docs.docker.com/compose/install/)
3. `$ git clone https://github.com/vanities/bitchan.git`
4. `$ make up`


### Structure

The development backend and frontend interact using the truffle stack.

#### Backend

The backend is written in [solidity contracts](https://solidity.readthedocs.io/en/latest/introduction-to-smart-contracts.html) using [Ethereum](https://ethereum.org/).


#### Frontend

The frontend is written in javascript/typescript and react.


### Testing

#### Backend

Testing the backend contracts can be done [here](https://github.com/vanities/bitchan/tree/master/contracts/test) and is written in solidity and typescript using [truffle](https://www.trufflesuite.com/docs/truffle/testing/testing-your-contracts).

`$ make test_contracts`

#### Frontend

Testing the frontend can be done [here](https://github.com/vanities/bitchan/tree/master/client/tests) and is written in typescript.

`$ make test_client`

### Stop
`$ make down`
