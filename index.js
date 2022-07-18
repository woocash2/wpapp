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

  getCommunityMembers() {
    console.log('Getting community members');
    axios.get(`https://${this.base}/${this.version}/community/members`, {
      params: Object.assign(this.getProof(), {
        access_token: this.accessToken,
      }),
    }).then(res => {
      console.log('Members acquired');
      for (field in res) {
        console.log(field);
      }
      res.render('members', {members: res.data});
    }).catch(err => {
      console.log(err);
    });
  }

  getInstallConfirmation() {
    console.log('Getting install confirm');
    axios.get(`https://${this.base}/${this.version}/community`, {
      params: Object.assign(this.getProof(), {
        access_token: this.accessToken,
        fields: 'install'
      }),
    }).then(res => {
      console.log('Install confirmation');
      for (field in res) {
        console.log(field);
      }
      res.render('installinfo', {type: res.data.install_type, appid: res.data.id});
    }).catch(err => {
      console.log(err);
    });
  }

  getProof() {
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

app.use('/community_members', (req, res) => {
  graph.getCommunityMembers();
  return res.status(200);
})

app.use('/install_confirm', (req, res) => {
  graph.getInstallConfirmation();
  return res.status(200);
})

app.use('/', (req, res) => {
  res.render('index');
})

app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'pug')
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
