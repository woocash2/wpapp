How to deploy with heroku

```
$ heroku create
heroku config:set APP_ID=<your app id>
heroku config:set APP_SECRET=<your app secret>
heroku config:set REDIRECT_URI=<your app url>/community_install
git push heroku main
heroku open
```
