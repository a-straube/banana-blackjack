var express = require('express')
var app = express()
var port = process.env.PORT || 8000

app.set('view engine', 'ejs')

app.use(express.static('static/'))

app.get('/', function(req, res, next) {
    res.status(200).render('index')
})

app.get('*splat', function(req, res) {
    res.status(404).render('404')
})

app.listen(port, function(err) {
    if (err) {
        throw err
    }
    console.log('== Server is listening on port:', port)
})
