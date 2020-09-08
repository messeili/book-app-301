'use strict'

require('dotenv').config();
const express = require('express');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT
const superagent = require('superagent');
const pg = require('pg');
const { query } = require('express');

const client = new pg.Client(process.env.DATABASE_URL)

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'))
app.use(methodOverride('_method'));

//app routes
app.get('/getBook/:bookID', bookDetailsHandler)
app.get('/searches/new', newBookHandler)
app.post('/addBook', addBookHandler)
app.post('/getBook/show', showBookHandler)
app.get('/', mainPageHandler)
app.post('/searches/show', apiDataHandler)
app.put('/updateBook/:bookID', updateBookHandler)
app.delete('/deleteBook/:bookID', deleteBookHandler)


//app functions
function updateBookHandler(req, res) {
    let { author, title, isbn, image_url, description } = req.body;
    let params = req.params.bookID;
    let SQL = 'UPDATE books SET author=$1,title=$2,isbn=$3,image_url=$4,description=$5 WHERE id=$6;';
    let safeValues = [author, title, isbn, image_url, description, params];
    client.query(SQL, safeValues)
        .then(() => {
            console.log(params);
            res.redirect(`/getBook/${params}`)
        })

}
function deleteBookHandler(req, res) {
    let SQL = `DELETE FROM books WHERE id=$1;`;
    let values = [req.params.bookID];
    client.query(SQL, values)
        .then(() => {
            res.redirect('/')
        })

}

async function mainPageHandler(req, res) {
    let SQL2 = 'SELECT COUNT(id) FROM books;'
    let count = await client.query(SQL2).then((results2) => { return (results2.rows[0].count); })
    let SQL = `SELECT * FROM books ORDER BY id DESC;`;
    client.query(SQL)
        .then((results) => {
            // console.log(results.rows);
            res.render('pages/books/show', { booksArr: results.rows, bookCount: count })
        })
}

function apiDataHandler(req, res) {
    let searchData = req.body.searchBox;
    let authorOrTitle = req.body.titleAuthor;
    console.log(req.body);
    let url = `https://www.googleapis.com/books/v1/volumes?q=+in${authorOrTitle}:${searchData}`
    console.log(url);
    superagent.get(url)
        .then((results) => {
            let bookData = results.body.items.map(book => {
                return new Book(book)

            })
            res.render('pages/searches/show', { data: bookData });
        })
        .catch(() => {
            errorHandler('Cannot Catch your Data from API', req, res)

        })
}

function errorHandler(error, req, res) {
    res.render('pages/error', { err: error });

};


function addBookHandler(req, res) {
    console.log(req.body);
    let { author, title, isbn, image_url, description } = req.body;
    let SQL = `INSERT INTO books (author, title, isbn, image_url, description) VALUES ($1,$2,$3,$4,$5);`;
    let safeValues = [author, title, isbn, image_url, description];
    client.query(SQL, safeValues)
        .then(() => {
            let SQL2 = 'SELECT * FROM books WHERE isbn=$1;';
            let values = [isbn];
            client.query(SQL2, values)
                .then((results) => {
                    console.log(results.rows[0].id);
                    res.redirect(`/getBook/${results.rows[0].id}`);
                })
        })

}

function newBookHandler(req, res) {
    res.render('pages/searches/new');
}

function bookDetailsHandler(req, res) {
    let SQL = `SELECT * FROM books WHERE id=$1`;
    let book_id = req.params.bookID;
    let values = [book_id];
    client.query(SQL, values)
        .then(results => {
            res.render('pages/books/detail', { bookDetails: results.rows[0] });

        })
}

function showBookHandler(req, res) {
    let SQL = `SELECT * FROM books ORDER BY id DESC;`;
    client.query(SQL)
        .then((results) => {
            // console.log(results.rows);
            res.render('pages/books/show', { booksArr: results.rows })
        })
}

//app constructor
function Book(data) {
    this.author = data.volumeInfo.authors || `There is no Authors`;
    this.title = data.volumeInfo.title;
    // this.isbn = data.volumeInfo.industryIdentifiers[0].identifier || 'there is no isbn';
    this.isbn = data.volumeInfo.industryIdentifiers ? data.volumeInfo.industryIdentifiers[0].identifier || 'There is no isbn found' : 'There is no isbn found';
    this.image_url = data.volumeInfo.imageLinks.thumbnail || `https://i.imgur.com/J5LVHEL.jpg`;
    this.description = data.volumeInfo.description || `There is no description`;
}

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`listening on port ${PORT}`);
        });
    });