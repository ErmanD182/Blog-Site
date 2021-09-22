require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require('lodash'); //using for truncate (shorter version)
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
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
        res.render("home", {homeStartingContent: homeStartingContent, posts: posts});
      }
    });
  }
  else{
  //  console.log("Not authenticated");
    res.redirect("/login");
  }
});


app.get("/about", function(req,res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req,res){
  res.render("contact", {contactContent: contactContent});
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

  if(req.isAuthenticated()){
    Post.findOne({_id: requestId}, function(err, foundPost){
      if(!err){
        currentPostId = requestId;
        res.render("post", {postTitle: foundPost.title, postContent: foundPost.content, postDate: foundPost.date, userName: foundPost.user});
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
      res.redirect("/");
    }
  });

});


app.post("/signup", function(req,res){

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


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
