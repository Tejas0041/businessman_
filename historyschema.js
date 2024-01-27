const mongoose= require('mongoose');
const Schema= mongoose.Schema;

const historySchema= new Schema({
    text: String,
});

module.exports= mongoose.model('History', historySchema);