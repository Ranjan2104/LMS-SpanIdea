import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import nodemailer from "nodemailer";
import crypto from "crypto";

const ENC= 'bf3c199c2470cb477d907b1e0917c17b';
const IV = "5183666c72eec9e4";
const ALGO = "aes-256-ctr"

const app = express()
app.use(express.json())
app.use(express.urlencoded())
app.use(cors())

const password = encodeURIComponent("Amresh@2104");
const mongoUrl = `mongodb+srv://amresh:${password}@cluster0.4uvhovb.mongodb.net/TestDatabase?retryWrites=true&w=majority`;

mongoose.connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to database");
})
.catch((e) => console.log(e));


const userSchema = new mongoose.Schema(
    {
        name: String,
        email: String,
        rollno: String,
        branch: String,
        password: String,
        block: Boolean,
        isactive: Boolean,
    },
);

const bookSchema = new mongoose.Schema (
    {
        Book_name: String,
        Author_name: String,
        category: String,
        isIssued: Boolean,
        block: Boolean,
    },
);

const Authentication = new mongoose.model("Authentication", userSchema); 

const BookShow = new mongoose.model("BookShow", bookSchema);
 
// Routes && APIS

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    Authentication.findOne({ email: email }, ( err, authentication ) => {
        if(authentication.isactive) {
            if(authentication) {
                if(password === authentication.password) {
                    res.send({ message: "Login Successfully", user: authentication })
                }
                else {
                    res.send({ message: "Password didn't match" })
                }
            }
            else {
                res.send({ message: "User not Found" });
            }
            }
        else {
            res.send({ message: "your email is not active, check your Mail!" })
        }
    });
});

app.get("/confirmation/:id", (req, res) => {
    const mailId = req.params.id;
    //decrypt ID.
    const decipher = crypto.createDecipheriv(ALGO, ENC, IV);
    var decrypted = decipher.update(mailId, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    Authentication.findOneAndUpdate({ _id : decrypted }, { isactive : true }, (err, val) => {
        if(val) {
            res.send("Email actived Successfully");
        }
        else {
            res.send(err);
        }
    })
});

app.post("/mail", async(req, res) => {
    const user_mail  = req.body.email;
    const user = await Authentication.findOne({email: user_mail});
    const user_id = user._id;
    //encrypter ID.
    const cipher = crypto.createCipheriv(ALGO, ENC, IV);
    var encrypted = cipher.update(user_id.toString(), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const url = `http://localhost:3000/confirmation/${encrypted}`;
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth:  {
            user: 'amresh.ranjan200@gmail.com',
            pass: 'stkc cvbq lbyv rrap'
        }
    })
    
    let info = transporter.sendMail({
        from: 'amresh.ranjan200@gmail.com',
        to: user_mail,
        subject: "Email Verification From LMS Site",
        text: "Hey! this is URL Link CLick here for Verify, " + url,
    })
    if(info) {
        res.send({message: 'Mail sent done!'})
    }
    else {
        res.send({message: 'Error while send Mail'})
    }
})

app.post("/register", (req, res) => {
    const { name, email, rollno , branch, password, block, isactive } = req.body;

    Authentication.findOne({ email: email }, (err, authentication) => {
        if(authentication) {
            res.send({ message: "User already Registered" })
        }
        else {
            const authentication = new Authentication({
                name,
                email,
                rollno,
                branch,
                password,
                block,
                isactive,
            })
            authentication.save( err => {
                if(err) {
                    res.send(err)
                } else {    
                    res.send({ message: "Successfully Registered and Verification link is sent to your id" })
                }
            }) 
        }
    })    
})

app.post("/addbooks", (req, res) => {
    const { Book_name, Author_name, category, isIssued } = req.body;
    BookShow.findOne({ Book_name : Book_name }, (err, bookShow) => {
        if(bookShow) {
            res.send({ message: "Book already Registered" })
        }
        else {
            const bookShow = new BookShow ({
                Book_name,
                Author_name,
                category,
                isIssued,
            })
            bookShow.save( err => {
                if(err) {
                    res.send(err)
                }
                else {
                    res.send({ message: "Book Added Successfully!!" })
                }
            })
        }
    })
})

app.post("/SubmitBook", (req, res) => {
    const { name } = req.body;
    BookShow.findOneAndUpdate({ Book_name : name }, { isIssued : false }, ( err, val ) => {
        if(val) {
            res.send({ message : "Book Submit Successfully!!" })
        }
        else {
            res.send(err);
        }
    })
})

app.post("/deleteBook", (req, res) => {
    const { name } = req.body;
    BookShow.findOneAndDelete({ Book_name : name }, (err, val) => {
        if(val) {
            res.send({ message : "Book Delete Successfully!!" });
        }
        else {
            res.send(err);
        }
    })
})

app.post("/findBook", (req, res) => {
    const { name } = req.body;
    BookShow.findOneAndUpdate({ Book_name : name }, { isIssued : true }, ( err, val ) => {
        if(val) {
            res.send({ message : "Book Issued Successfully!!" });
        }
        else {
            res.send(err);
        }
    })
});


app.post("/LibUpdate", (req, res) => {
    const { Book_name, Author_name, category, id } = req.body;
    BookShow.findOneAndUpdate({ _id : id }, { Book_name : Book_name, Author_name : Author_name, category : category }, (err, val) => {
        if(val) {
            res.send({ message : "Book Update Successfully!!" });
        }
        else {
            res.send({ message : "Book Update Failed!!" });
        }
    })
})

app.get("/LibHome", (req, res) => {
    BookShow.find({}, (err, val) => {
        if(val) {
            res.send(val)
        }
        else {
            res.send(err)
        }
    });
})

app.get("/StuBookDetail", (req, res) => {
    BookShow.find({ isIssued: { $ne: false , $exists: true}}, (err, val) => {
        if(val) {
            res.send(val)
        }
        else{
            res.send(err)
        }
    });
});

app.post("/UnblockStudent", (req, res) => {
    const { id } = req.body;
    Authentication.findOneAndUpdate({_id : mongoose.Types.ObjectId(id)}, { block : false }, ( err, ans ) => {
        if(ans) {
            BookShow.updateMany({}, { block : false }, (err, val) => {
                if(val) {
                    res.send({ message : "Student Unblock Successfully!!" })
                }
                else {
                    res.send(err);
                    console.log(err);
                }
            })
        }
        else {
            console.log(err);
            res.send(err);
        }
    })
})

app.post("/blockStudent", (req, res) => {
    const { id } = req.body;
    Authentication.findOneAndUpdate({_id : mongoose.Types.ObjectId(id)}, { block : true }, (err, ans) => {
        if(ans) {
            BookShow.updateMany({}, { block : true }, (err, val) => {
                if(val) {
                    res.send({ message : "Student block Successfully!!"})
                }
                else {
                    res.send(err);
                    console.log(err);
                }
            })
        }
        else {
            console.log(err);
            res.send(err);
        }
    })
})

app.get("/LibDetail", (req, res) => {
    Authentication.find({ rollno: { $ne:"" , $exists: true }, branch : { $ne:"" , $exists: true }}, (err, val) => {
        if(val) {
            res.send(val);
        }
        else {
            res.send(err);
            console.log(err);
        }
    });
});

app.listen(9002,() => {
    console.log("Connected to port 9002")
})