const axios = require('axios')
const qs = require('qs')
const xml = require('xml2js')
const firebase = require("firebase");
require("firebase/firestore");

const firebaseConfig = require('../firebaseConfig.json');
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

let _url = 'https://emap.pcsc.com.tw/EMapSDK.aspx'


let City = new Map([

    ['台北市', '01'],
    ['基隆市', '02'],
    ['新北市', '03'],
    ['桃園市', '04'],
    ['新竹市', '05'],
    ['新竹縣', '06'],
    ['苗栗縣', '07'],
    ['台中市', '08'],
    ['彰化縣', '10'],
    ['南投縣', '11'],
    ['雲林縣', '12'],
    ['嘉義市', '13'],
    ['嘉義縣', '14'],
    ['台南市', '15'],
    ['高雄市', '17'],
    ['屏東縣', '19'],
    ['宜蘭縣', '20'],
    ['花蓮縣', '21'],
    ['台東縣', '22'],
    ['澎湖縣', '23'],
    ['連江縣', '24'],
    ['金門縣', '25']

])



async function get_711_store() {

    for (let [city, id] of City) {
        let Town = []
        Town = await get_town(id)

        for (let town of Town) {
            let res = await get_city(city, town)
            parse_store(res, city, town)
        }
    }
}


async function get_town(id) {
    let town = []

    await axios.post(_url, qs.stringify({
        commandid: 'GetTown',
        cityid: id,
        leftMenuChecked: ''
    })).then(res => {
        xml.parseString(res.data, (err, result) => {
            result.iMapSDKOutput.GeoPosition.forEach(ele => {
                town.push(ele.TownName[0])
            })

        })
    }).catch(error =>{
        console.log(error)
    })
    return town;
}


async function get_city(city, town) {

    return await axios.post(_url, qs.stringify({
        commandid: 'SearchStore',
        city: city,
        town: town,
        roadname: '',
        ID: '',
        StoreName: '',
        SpecialStore_Kind: '',
        leftMenuChecked: '',
        address: ''
    })).catch(error =>{
        console.log(error)
    })
}


function parse_store(res, city, town) {

    xml.parseString(res.data, (err, result) => {

        result.iMapSDKOutput.GeoPosition.forEach(item => {
                
                let store = {
                    Name: item.POIName[0],
                    Taxonomy: 'UNIMART',
                    City: city,
                    Area: town,
                    Address: item.Address[0],
                    StoreID: item.POIID[0].replace(/\s/g, ''),
                    StorePhone: item.Telno[0].replace(/\s/g, ''),
                    StoreFax: item.FaxNo[0].replace(/\s/g, ''),
                    StoreService: service(item),
                }

                const Ref = db.collection('711').doc(store.StoreID);
                Ref.set(store).then(() => {
                    console.log("Document successfully written!");
                })
            
        })
    })
}


function service(item) {
    let Service = item.StoreImageTitle[0].split(',')
    let Service_array = []
    Service.forEach(item => {
        Service_array.push(item.slice(2, item.length))
    })
    return Service_array
}


get_711_store()