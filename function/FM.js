const axios = require('axios')
const qs = require('qs')
const firebase = require("firebase");
require("firebase/firestore");


const firebaseConfig = require('../firebaseConfig.json');
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);


let _url = 'https://api.map.com.tw/net/familyShop.aspx'


let City = ['台北市','基隆市','新北市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣', '雲林縣','嘉義市','嘉義縣','台南市',
            '高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','連江縣','金門縣']


async function get_FM_store() {

    for (let city of City) {
        let Town = []
        Town = await get_town(city)

        for (let town of Town) {
            let res = await get_city(city, town)
            parse_store(res, city, town)
        }
    }
}


async function get_town(id) {
    let town = []

    await axios.post(_url, qs.stringify({
        searchType : 'ShowTownList',
        type : '',
        city : id,
        fun : 'storeTownList',
        key : '6F30E8BF706D653965BDE302661D1241F8BE9EBC' 
    }),{
        headers: { 
            'Referer': 'https://www.family.com.tw/marketing/inquiry.aspx', 
        },
    }
    ).then(response => {
        let res = response.data
        res = JSON.parse(res.slice(14, res.length-1))
        
        for(let item of res){
            town.push(item.town)
        }
    }).catch(error =>{
        console.log(error)
    })
    return town;
}


async function get_city(city, town) {

    return await axios.post(_url, qs.stringify({
        searchType: 'ShopList',
        type: '',
        city: city,
        area: town,
        road: '',
        fun: 'showStoreList',
        key: '6F30E8BF706D653965BDE302661D1241F8BE9EBC'
    }),{
        headers: { 
            'Referer': 'https://www.family.com.tw/marketing/inquiry.aspx', 
        },
    }).catch(error =>{
        console.log(error)
    })
}


function parse_store(response, city, town) {

    let res = response.data
    res = JSON.parse(res.slice(14, res.length-1))

    res.forEach(item => {
            
            let store = {
                Name: item.NAME,
                Taxonomy: 'FAMI',
                City: city,
                Area: town,
                Address: item.addr,
                StoreID: item.pkey,
                StorePhone: item.TEL,
                StoreFax: item.POSTel,
                StoreService: service(item),
            }
            
            const Ref = db.collection('FM').doc(store.StoreID);
                Ref.set(store).then(() => {
                    console.log("Document successfully written!");
                })
       
    })
}



function service(item) {
    if(item['all'] == null) return ""
    let Service = item['all'].split(',')
    return Service
}



get_FM_store()
