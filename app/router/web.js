const { Router } = require('express');
const Api = require('../Controller/api/index');
router = new Router();

router.get('/getAddress', (req, res, next) => {
    console.log('/getAddress');
    Api.getAddress(req).then(str => {
        res.json(str);
    })
});

router.get('/withdraw', (req, res, next) => {
    console.log('/withdraw');
    let api = new Api();
    api.withdraw(req).then(str => {
        res.json(str);
    })
});

router.post('/', (req, res, next) => {
    console.log('/api');
    console.log('req', req.body);
    let api = new Api();
    api.main(req).then(str => {
        res.json(str);
    })
});






module.exports = router;



