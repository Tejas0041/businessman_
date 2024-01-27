if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express= require('express');
const app= express();
const path= require('path');
const User= require('./userschema.js');
const mongoose= require('mongoose');
const Bank= require('./bankerschema.js');
const session= require('express-session');
const History= require('./historyschema.js');

const dburl= process.env.DB_URL;
const localurl= 'mongodb://localhost:27017/businessman';

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));  //setting up the public directory to serve static files
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));

const sessionConfig= {
    name: 'businessman',
    httpOnly: true,
    secret: 'thismustbeabettersecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + (1000*60*60*24*7), //date is in milliseconds, we have set expire date as 7 days from the current date
        maxAge: (1000*60*60*24*7)
    }
}

app.use(session(sessionConfig));

mongoose.connect(localurl);
const db= mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", ()=>{
    console.log("Database Connected");
});

app.get('/', (req, res)=>{
    res.render('templates/login.ejs');
});

app.post('/', async(req, res)=>{
    const {username, password}= req.body;
    const u= await User.findOne({username, password});

    if(!u){
        return res.send("Username or password is incorrect");
    }

    // res.send(u);
    res.redirect(`/renderuserhome/${u._id}`);
});

app.get('/renderuserhome/:id', async(req, res)=>{
    const {id}= req.params;
    const u= await User.findById(id);

    res.render('gamepage/home.ejs', {u});
});

app.get('/register', (req, res)=>{
    res.render('templates/register.ejs');
});

app.post('/register', async(req, res)=>{
    const u= new User(req.body);
    await u.save();
    res.send(req.body);
});

app.get('/banklogin', (req, res)=>{
    res.render('templates/banklogin.ejs');
});

app.get('/bankhome', async(req, res)=>{
    const users= await User.find({});
    const b= await Bank.find({});
    const bank= b[0];

    return res.render('gamepage/bankhome.ejs', {users,bank});
});


app.post('/banklogin', async(req, res)=>{
    const {username, password}= req.body;


    if(username==='06070c53-f576-45e8-9d51-4dec39167af8' && password==='bankmadarchodhai'){
        return res.redirect('/bankhome');
    }

    res.send('Incorrect username or Password');
});

app.get('/startgame', async(req, res)=>{
    await User.updateMany({}, {$set: { balance: 15000 }}, {new: true});
    const users= await User.find({});
    await Bank.updateMany({}, {$set: { balance: 106650 }}, {new: true});
    const B= await Bank.find({});
    const bank= B[0];

    await History.deleteMany({});

    return res.redirect('/bankhome')
});

app.get('/end', async(req, res)=>{
    await User.updateMany({}, {$set: { balance: 0 }});
    await Bank.updateMany({}, {$set: { balance: 166650 }}, {new: true});
    await History.deleteMany({});
    const users= await User.find({});
    const b= await Bank.find({});
    const bank= b[0];
    return res.redirect('/bankhome');
});

app.get('/userprofile/:id', async(req, res)=>{
    const {id}= req.params;
    const user= await User.findById(id);
    res.render('templates/userprofile.ejs', {user});
});

app.post('/passingfee/:id', async(req, res)=>{
    const {id}= req.params;
    const u= await User.findById(id);
    uname= u.name;
    var str= {text: `Bank paid passing fee of ₹100 to ${uname}`};
    const s= new History(str);
    await s.save();
    await User.findByIdAndUpdate(id, { $inc: { balance: 100 } }, { new: true });
    await Bank.updateMany({}, { $inc: { balance: -100 } }, { new: true });

    res.redirect(`/userprofile/${id}`);
});

app.post('/customamount/:id', async(req, res)=>{
    const {id}= req.params;
    const amount= req.body.balance;

    if(amount<=0){
        return res.send("AMOUNT MUST BE GREATER THAN ₹0");
    }

    const u= await User.findById(id);
    uname= u.name;
    var str= {text: `Bank paid an amount of ₹${amount} to ${uname}`};
    const s= new History(str);
    await s.save();

    await User.findByIdAndUpdate(id, { $inc: { balance: amount } }, { new: true });
    await Bank.updateMany({}, { $inc: { balance: -amount } }, { new: true });

    res.redirect(`/userprofile/${id}`);
});

app.get('/tobank/:id', async(req, res)=>{
    const {id}= req.params;
    const u= await User.findById(id);

    const alluser= await User.find({ _id: { $ne: id } });
    res.render('templates/paymentpage.ejs', {u, alluser});
});

app.post('/tobank/:id', async(req, res)=>{
    const {id}= req.params;
    const amount= req.body.balance;

    if(amount<=0){
        return res.send("AMOUNT MUST BE GREATER THAN ₹0");
    }



    const u= await User.findById(id);
    uname= u.name;

    const ubalance= u.balance;

    if(amount>ubalance){
        return res.send("Insufficient Balance");
    }

    var str= {text: `${uname} paid an amount of ₹${amount} to Bank`};
    const s= new History(str);
    await s.save();

    await User.findByIdAndUpdate(id, { $inc: { balance: -amount } }, { new: true });
    await Bank.updateMany({}, { $inc: { balance: amount } }, { new: true });
    const U= await User.findById(id);

    res.redirect(`/renderuserhome/${U._id}`);
});

app.post('/userpayment/:u/:payee', async(req, res)=>{
    const data= req.params;

    const receiver= data.payee;
    const payer= data.u;

    const amount= req.body.balance;

    const R= await User.findById(receiver);
    const Rname= R.name;

    const P= await User.findById(payer);
    const Pname= P.name;

    const ubalance= P.balance;

    if(amount>ubalance){
        return res.send("Insufficient Balance");
    }

    var str= {text: `${Pname} paid an amount of ₹${amount} to ${Rname}`};
    const s= new History(str);
    await s.save();

    await User.findByIdAndUpdate(payer, { $inc: { balance: -amount } }, { new: true });
    await User.findByIdAndUpdate(receiver, { $inc: { balance: amount } }, { new: true });
    const U= await User.findById(payer);

    res.redirect(`/renderuserhome/${U._id}`);
});

app.get('/history', async(req, res)=>{
    const history= await History.find({}).exec();
    res.render('templates/history.ejs', {history});
});


app.listen(3000, ()=>{
    console.log("Server started successfully on port 3000");
});