const axios = require('axios')
const cheerio = require('cheerio');
const qs = require('qs')
const firebase = require("firebase");
require("firebase/firestore");


const firebaseConfig = require('../firebaseConfig.json');
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);


let _url = 'https://www.okmart.com.tw/convenient_shopSearch_Result.aspx'
let _urlshop = 'https://www.okmart.com.tw/convenient_shopSearch_ShopResult.aspx'
const rules = /(?<city>\D+[縣市])(?<town>\D+[鄉鎮市區])/


async function get_OK_storeID() {
    let store = []
    let res = await axios.get(_url).catch(error => {
        console.log(error)
    })
    const $ = cheerio.load(res.data);
    $("html body ul li").each(function () {
        let text = $(this).find("div a[href]").attr('href')
        store.push(text.substring(21, 25))
    })
    return store
}


async function get_OK_store() {

    let Store = await get_OK_storeID()


    for (let id of Store) {
        axios({
            method: 'get', url: _urlshop,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: qs.stringify({
                'id': id
            })
        }).then(res => {
            const $ = cheerio.load(res.data);
            let text = $("html body").text()
            text = text.split('\n')
            let store = {
                Name: '',
                Taxonomy: 'OKMART',
                City: '',
                Area: '',
                Address: '',
                StoreID: '',
                StorePhone: '',
                StoreFax: '',
                StoreService: '',
            }

            for (let item of text) {


                switch (true) {
                    case item.includes('回清單'): {
                        item = item.replace(/\s/g, '')
                        store.Name = item.slice(0, item.length - 3)
                        break
                    }
                    case item.includes('門市地址'): {
                        item = item.split("：")
                        store.Address = item[1]
                        store.Area = item[1].match(rules).groups.town
                        store.City = item[1].match(rules).groups.city
                        break
                    }
                    case item.includes('門市電話'): {
                        item = item.split("：")
                        store.StorePhone = item[1]
                        break
                    }
                    case item.includes('門市店號'): {
                        item = item.split("：")
                        store.StoreID = item[1]
                        break
                    }
                    case include_tag(item): {
                        item = item.split(" ")
                        let Service = []
                        for (let ele of item) {
                            if (ele == '') continue
                            Service.push(ele)
                        }
                        store.StoreService = Service
                        break
                    }
                    default: {
                        break
                    }
                }

            }

            const Ref = db.collection('OK').doc(store.StoreID);
                Ref.set(store).then(() => {
                    console.log("Document successfully written!");
                })
                

        }).catch(error => {
            console.log(error)
        })
    }
}


function include_tag(str) {
    let arr = ['鮮食服務', '燒番薯', '現煮咖啡', '包子機', '現煮餐', '哈燒熱點', '茶葉蛋', '熱狗機',
    '甜蜜Me','霜淇淋', '雪花冰', 'OK COOK']

    for (item of arr){
        if(str.includes(item)) return true
    }
    
    return false
}


get_OK_store()