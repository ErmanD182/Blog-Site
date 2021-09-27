require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require('lodash'); //using for truncate (shorter version)
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const favicon = require("serve-favicon");
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
//local mongodb database
//mongoose.connect("mongodb://localhost:27017/blogDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
mongoose.set("useCreateIndex", true);

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  contentShort: String,
  date: String,
  user: String
});

const Post = new mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  posts: [postSchema]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

let currentPostId = "";

app.get("/", function(req,res){
  if(req.isAuthenticated()){
  //  console.log("Is authenticated");
    Post.find({}, function(err,posts){
      if(!err){
        res.render("home", {posts: posts});
      }
    });
  }
  else{
  //  console.log("Not authenticated");
    res.redirect("/login");
  }
});


app.get("/about", function(req,res){
  res.render("about", {loggedIn: req.isAuthenticated() ? true : false});
});

app.get("/contact", function(req,res){
  res.render("contact", {loggedIn: req.isAuthenticated() ? true : false});
});

app.get("/compose", function(req,res){
  if(req.isAuthenticated()){
    res.render("compose");
  }
  else{
    res.redirect("/login");
  }
});

app.get("/login", function(req,res){
  res.render("login");
});

app.get("/signup", function(req,res){
  res.render("signup");
});

app.get("/signout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/posts/:id", function(req,res){
  const requestId = req.params.id;
  let showDeleteBtn = false;

  if(req.isAuthenticated()){
    Post.findOne({_id: requestId}, function(err, foundPost){
      if(!err){
        currentPostId = requestId;

        if(foundPost.user === req.user.name){
          showDeleteBtn = true;
        }
        res.render("post", {postTitle: foundPost.title, postContent: foundPost.content, postDate: foundPost.date, userName: foundPost.user, check: showDeleteBtn});
      }
    });
  }

  else{
    res.redirect("/login");
  }
});

app.get("/my-posts", function(req,res){
  if(req.isAuthenticated()){
    Post.find({user: req.user.name}, function(err,posts){
      if(!err){
        res.render("my-posts", {posts: posts});
      }
    });
  }
  else{
    res.redirect("/login");
  }
});

app.post("/back", function(req,res){
  res.redirect("/");
});

app.post("/compose", function(req,res){
  const today = new Date();
  const todayFormatted = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes();

  const newPost = new Post({
    title: req.body.titleInput,
    content: req.body.textAreaInput,
    contentShort: _.truncate(req.body.textAreaInput,{
      length: 100}),
      date: todayFormatted,
      user: req.user.name
  });

  const posts = req.user.posts;
  posts.push(newPost);

  User.updateOne({_id: req.user._id},{posts: posts}, function(err){
    if(err){
      console.log(err);
    }
  });

  newPost.save(function(err){
    if(!err){
      res.redirect("/");
    }
  });

});

app.post("/btn", function(req,res){
  res.redirect("/compose");
});


app.post("/delete", function(req,res){
  Post.findByIdAndRemove(currentPostId, function(err){
    if(!err){
      User.findByIdAndUpdate(
        {_id: req.user._id},
        {$pull: {posts: { _id: currentPostId }}}, function(err){
        if(!err){
          res.redirect("/");
        }
        else{
          console.log(err);
        }
      });

    }
  });

});


app.post("/signup", async function(req,res){
  const sameUsername = await getSameUserName(req.body.name);
  //console.log("sameusername: " + sameUsername);
  const sameEmail = await getSameEmail(req.body.username);
  //console.log("same email: " + sameEmail);
  if(sameUsername === false && sameEmail === false){
    User.register({username: req.body.username, name: req.body.name}, req.body.password, function(err, user){
      if (err){
        console.log(err);
        res.redirect("/signup");
      }
      else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/");
        });
      }
    });
  }
  else{
    res.redirect("/signup");
  }




});

app.post("/login", function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    }
    else{
      passport.authenticate("local", {failureRedirect: "/login"})(req, res, function(){
        res.redirect("/");
      });
    }
  });

});


async function getSameUserName(username){
  let foundSameUser = true;
  await User.findOne({name: username}, function(err, foundUser){
  //  console.log("Finding username...");
    if(!err){
      if(foundUser === null){
        foundSameUser = false;
      }
    }
    else{
      console.log(err);
    }
  });
return foundSameUser;
}

async function getSameEmail(email){
  let foundSameEmail = true;
  await User.findOne({username: email}, function(err, foundUser){
  //  console.log("Finding email...");
    if(!err){
      if(foundUser === null){
        foundSameEmail = false;
      }
    }
    else{
      console.log(err);
    }
  });
return foundSameEmail;
}


app.listen(process.env.PORT || 3000, function() {
  console.log("Server has started");
});
