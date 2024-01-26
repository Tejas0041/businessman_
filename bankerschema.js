const mongoose= require('mongoose');
const Schema= mongoose.Schema;

const bankSchema= new Schema({
    username: String,
    password: String,
    balance: Number //₹166650
});

module.exports= mongoose.model('Bank', bankSchema);