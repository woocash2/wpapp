const express = require('express')
const crypto = require('crypto')
const https = require('https')
const axios = require('axios')
const querystring = require('querystring')

const path = require('path')
const { render } = require('express/lib/response')
const { groupEnd } = require('console')
const PORT = process.env.PORT || 5000

class Graph {
  constructor() {
    this.base = 'graph.workplace.com';
    this.version = 'v3.3';
    this.accessToken = undefined
  }

  acquireToken(code) {
    const params = {
      client_id: process.env.APP_ID,
      client_secret: process.env.APP_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      code: code,
    };
    axios.get(`https://${this.base}/${this.version}/oauth/access_token`, {
      params: {
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        code: code,
      }
    }).then(res => {
      console.log('Token acquired');
      this.accessToken = res.data.access_token;
      console.log(this.accessToken.slice(0, 10));
    });
  }

  getCommunityMembers(main_res) {
    console.log('Getting community members');
    axios.get(`https://${this.base}/${this.version}/community/members`, {
      params: Object.assign(this.getProof(), {
        access_token: this.accessToken,
      }),
    }).then(res => {
      console.log('Members acquired');
      let membs = []
      for (let user of res.data.data) {
        membs.push(user['name']);
      }
      main_res.status(200).render('members', {members: membs});
    }).catch(err => {
      console.log(err);
      main_res.status(400).send();
    });
  }

  getMe(main_res) {
    console.log('Getting install confirm');
    axios.get(`https://${this.base}/${this.version}/me`, {
      params: Object.assign(this.getProof(), {
        access_token: this.accessToken,
      }),
    }).then(res => {
      console.log('Me');
      main_res.status(200).render('me', {name: res.data.name});
    }).catch(err => {
      console.log(err);
      main_res.status(400).send();
    });
  }

  getProof() {
    if (this.accessToken === undefined) {
      return {};
    }

    const appsecretTime = Math.floor(Date.now() / 1000) - 5;
    const appsecretProof = crypto
      .createHmac('sha256', process.env.APP_SECRET)
      .update(this.accessToken + '|' + appsecretTime)
      .digest('hex');
    return {
      appsecret_proof: appsecretProof,
      appsecret_time: appsecretTime
    };
  }
}


app = express()
graph = new Graph()

app.use('/community_install', (req, res) => {
  if (!req.query.code)
    return res.status(400)
  console.log('Code received')
  graph.acquireToken(req.query.code);
  return res.status(200).send('Success!');
})

app.get('/community_members', (req, res) => {
  graph.getCommunityMembers(res);
})

app.use('/me', (req, res) => {
  graph.getMe(res);
})

app.use('/', (req, res) => {
  console.log('Rendering main site');
  res.render('index');
})

app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'pug')
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
