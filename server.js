'use strict'

require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT
const superagent = require('superagent');
const pg = require('pg');

const client = new pg.Client(process.env.DATABASE_URL)

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'))


app.get('/getBook/:bookID', bookDetailsHandler)
app.get('/searches/new', newBookHandler)
app.post('/addBook', addBookHandler)
app.get('/', (req, res) => {
    let SQL = `SELECT * FROM books ORDER BY id DESC;`;
    client.query(SQL)
        .then((results) => {
            // console.log(results.rows);
            res.render('pages/books/show', { booksArr: results.rows })
        })
});

app.post('/searches/show', (req, res) => {
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
})



function Book(data) {
    this.author = data.volumeInfo.authors || `There is no Authors`;
    this.title = data.volumeInfo.title;
    // this.isbn = data.volumeInfo.industryIdentifiers[0].identifier || 'there is no isbn';
    this.isbn = data.volumeInfo.industryIdentifiers ? data.volumeInfo.industryIdentifiers[0].identifier || 'There is no isbn found' : 'There is no isbn found';
    this.image_url = data.volumeInfo.imageLinks.thumbnail || `https://i.imgur.com/J5LVHEL.jpg`;
    this.description = data.volumeInfo.description || `There is no description`

}

function errorHandler(error, req, res) {
    res.render('pages/error', { err: error });

};
client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`listening on port ${PORT}`);
        });
    });

function addBookHandler(req, res) {
    console.log(req.body);
    let { author, title, isbn, image_url, description } = req.body;
    let SQL = `INSERT INTO books (author, title, isbn, image_url, description) VALUES ($1,$2,$3,$4,$5);`;
    let safeValues = [author, title, isbn, image_url, description];
    client.query(SQL, safeValues)
        .then(() => {
            res.redirect('/');
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