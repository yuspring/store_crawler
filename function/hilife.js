const axios = require('axios')
const cheerio = require('cheerio');
const qs = require('qs')
const firebase = require("firebase");
require("firebase/firestore");


_url = 'https://www.hilife.com.tw/storeInquiry_street.aspx'


const firebaseConfig = require('../firebaseConfig.json');
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);


async function get_hilife_store() {

    let City = await get_city()
    let token = ""

    for (let city of City) {
        token = await get_token(city)
        let Town = await get_town(city, token['__VIEWSTATE'], token['__EVENTVALIDATION'])
        for (let town of Town) {
            token = await parse_store(city, town, token['__VIEWSTATE'], token['__EVENTVALIDATION'])
        }
    }

}


async function get_city() {
    let res = await axios.get(_url).catch(function (error) {
        console.log(error);
    });
    const $ = cheerio.load(res.data)
    let context = $('html body [method="post"] [name="CITY"]').text().split("\n")
    let city = []
    context.forEach(item => {
        if (item != '') city.push(item.substring(1, 5))
    })

    return city
}

async function get_town(city, __VIEWSTATE, __EVENTVALIDATION) {
    let res = await axios(set_config(city, __VIEWSTATE, __EVENTVALIDATION)).catch(function (error) {
        console.log(error);
    });
    const $ = cheerio.load(res.data)
    let context = $('html body [method="post"] [name="AREA"]').text().split("\n")
    let town = []
    context.forEach(item => {
        if (item != '') town.push(item.substring(1, 5))
    })

    return town
}

async function get_token(city = null) {
    let _data = {
        '__VIEWSTATE': '',
        '__EVENTVALIDATION': ''
    }
    if (city == null) {
        let res = await axios.get(_url).catch(function (error) {
            console.log(error);
        })
        const $ = cheerio.load(res.data);
        _data['__VIEWSTATE'] = $('html body [method="post"] [id="__VIEWSTATE"]').attr('value')
        _data['__EVENTVALIDATION'] = $('html body [method="post"] [id="__EVENTVALIDATION"]').attr('value')
    }
    else {
        let context = await get_token()
        let res = await axios(set_config(city, context['__VIEWSTATE'], context['__EVENTVALIDATION'])).catch(function (error) {
            console.log(error);
        });
        const $ = cheerio.load(res.data);
        _data['__VIEWSTATE'] = $('html body [method="post"] [id="__VIEWSTATE"]').attr('value')
        _data['__EVENTVALIDATION'] = $('html body [method="post"] [id="__EVENTVALIDATION"]').attr('value')
    }
    return _data
}


function set_config(city, __VIEWSTATE, __EVENTVALIDATION, town = null) {
    let config = {
        method: 'post',
        url: _url,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: ''
    }
    if (town == null) {

        config.data = qs.stringify({
            '__EVENTTARGET': 'CITY',
            '__VIEWSTATE': __VIEWSTATE,
            '__EVENTVALIDATION': __EVENTVALIDATION,
            'CITY': city
        })
    }
    else {
        config.data = qs.stringify({
            '__EVENTTARGET': 'AREA',
            '__VIEWSTATE': __VIEWSTATE,
            '__EVENTVALIDATION': __EVENTVALIDATION,
            'CITY': city,
            'AREA': town
        })
    }
    return config
}

async function parse_store(city, town, __VIEWSTATE, __EVENTVALIDATION) {
    let _data = {
        '__VIEWSTATE': '',
        '__EVENTVALIDATION': ''
    }
    let res = await axios(set_config(city, __VIEWSTATE, __EVENTVALIDATION, town)).catch(function (error) {
        console.log(error);
    })
    const $ = cheerio.load(res.data)
    let context = $('html body [method="post"] .searchResults tbody tr')
    for (let i = 0; i < context.length; i++) {
        let store = {
            Name: '',
            Taxonomy: 'HILIFE',
            City: city,
            Area: town,
            Address: '',
            StoreID: '',
            StorePhone: '',
            StoreFax: '',
            StoreService: [],
        }
        let text = context.eq(i).text().split('\n')
        let store_info = []
        for (item of text) {
            item = item.replace(/\s/g, '')
            if (item != '') store_info.push(item)
        }

        store.StoreID = store_info[0]
        store.Name = store_info[1]
        store.Address = store_info[2]
        if (store_info.length >= 4) store.StorePhone = store_info[3]
        const $$ = cheerio.load($('html body [method="post"] .searchResults tbody tr td').html())
        for (let i = 0; i < $$("[title]").length; i++) {
            store.StoreService.push($$("[title]").eq(i).attr('title'))
        }


        const Ref = db.collection('hilife').doc(store.StoreID);
        Ref.set(store).then(() => {
            console.log("Document successfully written!");
        })
    }

    
    _data['__VIEWSTATE'] = $('html body [method="post"] [id="__VIEWSTATE"]').attr('value')
    _data['__EVENTVALIDATION'] = $('html body [method="post"] [id="__EVENTVALIDATION"]').attr('value')
    return _data

}


get_hilife_store()