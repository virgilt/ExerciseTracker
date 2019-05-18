'use strict';

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto-random-string');

const app = express();

const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false });

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))

let exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String
  },
  exercise: [{
    description: String,
    duration: Number,
    date: {
      type: Date,
      default: Date.now()
    }
  }]
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/exercise/new-user', async (req, res) => {
  let {username} = req.body;
  
  const duplicateData = await Exercise.find({username: `${username}`});
  console.log(duplicateData.length);
  
  if (duplicateData.length > 0) {
    console.log(duplicateData.length)
    const {username, userId} = duplicateData[0];
    return res.json({username, userId});
  };
  
  if (duplicateData.length < 1) {
    let user_Id = crypto({length: 8, type: 'base64'});
    console.log(user_Id);
    
    let saveExercise = await Exercise.create({
      username: `${req.body.username}`,
      userId: `${user_Id}`
    });
    console.log(`Saved ${saveExercise}`);
    
    const duplicateData = await Exercise.find({username: `${req.body.username}`});
    const {username, userId} = duplicateData[0];
    return res.json({username, userId});
    
  };
});

app.post('/api/exercise/add', async (req, res) => {
  
  let {userId, description, duration, date} = req.body;
  
  const duplicateData = await Exercise.find({userId: `${userId}`});
  
  if (duplicateData.length < 1) {
    res.json({error: 'ID Unknown'});
  };
  
  if (duplicateData.length > 0) {
    let {userId, description, duration, date} = req.body;
    
    let update = Exercise.findOneAndUpdate(
      {userId: userId}, 
      {$push: {
        exercise: {
          description: description,
          duration: duration,
          date: date
          }
        }
      }, 
      {upsert: true, new: true}, 
      ((err, data) => {
        if(err) throw err;
      }));
    res.json({
      username: `${duplicateData[0].username}`,
      userId: userId,
      description: description,
      duration: duration,
      date: date
    });
  };
});

app.get('/api/exercise/log', async (req, res) => {
  let userId = req.query.userId;
  let from = new Date(req.query.from);
  let to = new Date(req.query.to);
  let limit = req.query.limit;
  
  let log = await Exercise.findOne({userId: userId}, function (err, data) {
    if (err) throw err;
    if (!data) {
      res.json({error: 'No user found'});
    } else {
        let exercises = data.exercise;
        if (to && from) {
          exercises.filter((item) => {
             return item.date >= from && item.date <= to                  
          });
        }
        if (!isNaN(limit)) {
          exercises = exercises.slice(0, limit);
        }
        res.json({exercise: exercises});
    };
  });
});

// Not found middleware

// Error Handling middleware

app.listen(port, () => {
console.log('Node.js listening...')
})
