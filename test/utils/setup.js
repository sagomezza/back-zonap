const admin = require("firebase-admin");
// firebase emulators:start --project=potato
// export FIRESTORE_EMULATOR_HOST="localhost:8080"
admin.initializeApp({ projectId: "potato" });

const db = admin.firestore();

//---------DATES FOR CHECKPARKING PK LLERAS-------------
const lessThan5MinutesPKlleras = new Date((admin.firestore.Timestamp.now()._seconds - 240) * 1000);
const fractionPKlleras = new Date((admin.firestore.Timestamp.now()._seconds - 301) * 1000);
const hourPKlleras = new Date((admin.firestore.Timestamp.now()._seconds - 1861) * 1000);
const hourFractionPKlleras = new Date((admin.firestore.Timestamp.now()._seconds - 3661) * 1000);
const dayPKlleras = new Date((admin.firestore.Timestamp.now()._seconds - 16261) * 1000);
const couponDayPKlleras = new Date((admin.firestore.Timestamp.now()._seconds - 12661) * 1000);

//---------DATES FOR CHECKPARKING ClINICA MEDELLIN-------------
const lessThanHourCM = new Date((admin.firestore.Timestamp.now()._seconds - 1) * 1000);
const hourFraction1CM = new Date((admin.firestore.Timestamp.now()._seconds - 3601) * 1000);
const hourFraction2CM = new Date((admin.firestore.Timestamp.now()._seconds - 4501) * 1000);
const hourFraction3CM = new Date((admin.firestore.Timestamp.now()._seconds - 5401) * 1000);
const twoHoursCM = new Date((admin.firestore.Timestamp.now()._seconds - 6301) * 1000);
const twoHoursFraction1CM = new Date((admin.firestore.Timestamp.now()._seconds - 7201) * 1000);
const dayCM = new Date((admin.firestore.Timestamp.now()._seconds - 16261) * 1000);
const couponDayCM = new Date((admin.firestore.Timestamp.now()._seconds - 12661) * 1000);

//---------DATES FOR RECIPS-----------

const atMoment = new Date((admin.firestore.Timestamp.now()._seconds - 240) * 1000);
const backwardsTime1 = new Date((admin.firestore.Timestamp.now()._seconds - 1861) * 1000);
const backwardsTime2 = new Date((admin.firestore.Timestamp.now()._seconds - 3361) * 1000);
const backwardsTime3 = new Date((admin.firestore.Timestamp.now()._seconds - 10880) * 1000);

//---------DATES FOR MENSUALITY--------

const aMonthAgo = new Date((admin.firestore.Timestamp.now()._seconds - 3024000) * 1000);

db.collection("headquarters").get().then(hqList => {
    hqList.forEach(hq => {
        db.collection('headquarters').doc(hq.id).delete()
    })
})

db.collection("users").get().then(users => {
    users.forEach(user => {
        db.collection('users').doc(user.id).delete()
    })
})

db.collection("mensualities").get().then(mensualities => {
    mensualities.forEach(men => {
        db.collection('mensualities').doc(men.id).delete()
    })
})

db.collection("corporations").doc("ZhMcx4cZU41ToFbJEYz2").set({
    admins: [],
    businessName: "Corporación de Fomento Asistencial del Hospital Universitario San Vicente de Paúl",
    hqs: ["iIJJcbIpMdVeYwEDK6mJ"],
    leancoreId: "",
    location: {
        address: "Calle 5a #39-194, Torre Diners oficina 602, Medellín",
        coordinates: [-75.0987, 6.2234432]
    },
    name: "Corpaul",
    nit: "890981683-8",
    offcials: [],
    phone: "4480550 OPC 3",
    type: "private",
    urlResponse: ""
})

db.collection("mensualities").doc("wdX4oxpTqZ876kcKj71R").set({
    capacity: 1,
    hqId: "iIJJcbIpMdVeYwEDK6mJ",
    monthlyUser: true,
    officialEmail: "funcionario@unittesting.test",
    parkedPlatesList: [],
    plates: ["ZZZ888"],
    status: "due",
    type: "personal",
    userId: "yr0h4JpwNRCZtY2eBLTT",
    userPhone: "+573213218927",
    validity: aMonthAgo,
    vehicleType: "car"
})

// db.collection("users").doc("yr0h4JpwNRCZtY2eBLnP").set({
//         email: "test@unittesting.com",
//         phone: "+573213218989",
//         name: "User",
//         lastName: "Tester",
//         plates: ["TTT000"],
//         brand: "Mazda",
//         vehicleType: "car",
//         type: "full"
// })

db.collection("users").doc("yr0h4JpwNRCZtY2eBLTT").set({
    email: "test@unittesting.com",
    phone: "+573213218927",
    name: "User",
    lastName: "Tester",
    plates: ["ZZZ777"],
    brand: "Mazda",
    vehicleType: "car",
    type: "full"
})

db.collection("headquarters").doc("iIJJcbIpMdVeYwEDK6mJ").set({
    dailyBikePrice: 15000,
    dailyCarPrice: 25200,
    hourBikePrice: 3200,
    hourCarPrice: 5400, 
    fractionCarPrice: 2700,
    fractionBikePrice: 1600,
    availableBikes: 42,
    availableCars: 171,
    monthlyBikePrice: 76500,
    monthlyCarPrice: 185700,
    name: "PK Lleras",
    totalBikes: "50",
    totalCars: "179",
    reservations: [
        //-------BIKES-------
        {
            cash: 0,
            change: 0,
            dateStart: lessThan5MinutesPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795190',
            plate: 'HOO33Z',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: fractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795191',
            plate: 'HOO33A',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795192',
            plate: 'HOO33B',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121412
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795193',
            plate: 'HOO33C',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121413
        },
        {
            cash: 0,
            change: 0,
            dateStart: dayPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795194',
            plate: 'HOO33D',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121414
        },
        //-------CARS-------
        {
            cash: 0,
            change: 0,
            dateStart: lessThan5MinutesPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795100',
            plate: 'HOO330',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: fractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795195',
            plate: 'HOO33E',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795196',
            plate: 'HOO33F',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121412
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795197',
            plate: 'HOO33G',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121413
        },
        {
            cash: 0,
            change: 0,
            dateStart: dayPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795198',
            plate: 'HOO33H',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121414
        },
        //-------BIKES w COUPONS-------
        {
            cash: 0,
            change: 0,
            dateStart: fractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795181',
            plate: 'GOO33A',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795182',
            plate: 'GOO33B',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121412
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795183',
            plate: 'GOO33C',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121413
        },
        {
            cash: 0,
            change: 0,
            dateStart: couponDayPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795184',
            plate: 'GOO33D',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121414
        },
        //-------CARS w COUPONS-------
        {
            cash: 0,
            change: 0,
            dateStart: fractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795185',
            plate: 'GOO33E',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795186',
            plate: 'GOO33F',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121412
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFractionPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795187',
            plate: 'GOO33G',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121413
        },
        {
            cash: 0,
            change: 0,
            dateStart: couponDayPKlleras,
            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795188',
            plate: 'GOO33H',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121414
        },
    ]
}).catch(err => console.log(err))

//---------HEADQUATER CLINICA MEDELLIN--------

db.collection("headquarters").doc("kPlPR3Rysv3uCsrUdcn2").set({
    dailyBikePrice: 10500,
    dailyCarPrice: 21500,
    hourBikePrice: 2100,
    hourCarPrice: 4300, 
    fractionCarPrice: 1100,
    fractionBikePrice: 500,
    availableBikes: 18,
    availableCars: 149,
    monthlyBikePrice: 54000,
    monthlyCarPrice: 121000,
    name: "Clínica Medellín Occidente Sótano",
    totalBikes: "26",
    totalCars: "158",
    totalBicycles: "8",
    reservations: [
        //-------BIKES-------
        {
            cash: 0,
            change: 0,
            dateStart: lessThanHourCM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795190',
            plate: 'HOO33Z',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFraction1CM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795191',
            plate: 'HOO33A',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFraction2CM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795192',
            plate: 'HOO33B',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121412
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFraction3CM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795193',
            plate: 'HOO33C',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121413
        },
        {
            cash: 0,
            change: 0,
            dateStart: twoHoursCM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795194',
            plate: 'HOO33D',
            prepayFullDay: false,
            type: 'bike',
            verificationCode: 121414
        },
        //-------CARS-------
        {
            cash: 0,
            change: 0,
            dateStart: lessThanHourCM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795100',
            plate: 'HOO330',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFraction1CM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795195',
            plate: 'HOO33E',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121411
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFraction2CM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795196',
            plate: 'HOO33F',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121412
        },
        {
            cash: 0,
            change: 0,
            dateStart: hourFraction3CM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795197',
            plate: 'HOO33G',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121413
        },
        {
            cash: 0,
            change: 0,
            dateStart: twoHoursCM,
            hqId: 'kPlPR3Rysv3uCsrUdcn2',
            officialEmail: 'funcionario@zonap.test',
            phone: '+563017795198',
            plate: 'HOO33H',
            prepayFullDay: false,
            type: 'car',
            verificationCode: 121414
        },
        // //-------BIKES w COUPONS-------
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: fraction,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795181',
        //     plate: 'GOO33A',
        //     prepayFullDay: false,
        //     type: 'bike',
        //     verificationCode: 121411
        // },
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: hour,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795182',
        //     plate: 'GOO33B',
        //     prepayFullDay: false,
        //     type: 'bike',
        //     verificationCode: 121412
        // },
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: hourFraction,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795183',
        //     plate: 'GOO33C',
        //     prepayFullDay: false,
        //     type: 'bike',
        //     verificationCode: 121413
        // },
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: couponDay,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795184',
        //     plate: 'GOO33D',
        //     prepayFullDay: false,
        //     type: 'bike',
        //     verificationCode: 121414
        // },
        // //-------CARS w COUPONS-------
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: fraction,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795185',
        //     plate: 'GOO33E',
        //     prepayFullDay: false,
        //     type: 'car',
        //     verificationCode: 121411
        // },
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: hour,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795186',
        //     plate: 'GOO33F',
        //     prepayFullDay: false,
        //     type: 'car',
        //     verificationCode: 121412
        // },
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: hourFraction,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795187',
        //     plate: 'GOO33G',
        //     prepayFullDay: false,
        //     type: 'car',
        //     verificationCode: 121413
        // },
        // {
        //     cash: 0,
        //     change: 0,
        //     dateStart: couponDay,
        //     hqId: 'kPlPR3Rysv3uCsrUdcn2',
        //     officialEmail: 'funcionario@zonap.test',
        //     phone: '+563017795188',
        //     plate: 'GOO33H',
        //     prepayFullDay: false,
        //     type: 'car',
        //     verificationCode: 121414
        // },
    ]
}).catch(err => console.log(err))

db.collection("coupons").doc("YGgc0L").set({
    createdBy: "milena@corpaul.com",
    creationDate: new Date((admin.firestore.Timestamp.now()._seconds - 3600) * 1000),
    expireDate: new Date((admin.firestore.Timestamp.now()._seconds + 432000) * 1000),
    hqId: "iIJJcbIpMdVeYwEDK6mJ",
    isValid: true,
    maxUsers: 109,
    promotionType: "discount",
    renewable: true,
    type: "agreement",
    value: {
        bike:{
            day: "70%",
            fraction: "53.125%",
            hours: "53.125%",
            month: "41.1775%"
        },
        car: {
            day: "64.2857143%",
            fraction: "44.45%",
            hours: "44.42%",
            month: "51.535%"
        }
    },
    claimedBy: [
        "+563017795181",
        "+563017795182",
        "+563017795183",
        "+563017795184",
        "+563017795185",
        "+563017795186",
        "+563017795187",
        "+563017795188",
    ]
}).catch(err => console.log(err))

//---------RECIPS CREATION-----------
db.collection("recips").doc("PLL38000").set(
    {
        cash: 10000,
        change: 6800,
        dateFinished: atMoment,
        dateStart: backwardsTime1,
        hours: 0.6553345,
        hqId: "iIJJcbIpMdVeYwEDK6mJ",
        officialEmail: "funcionario@zonap.test",
        paymentStatus: "payed",
        paymentType: "cash",
        phone: "+573017795191",
        plate: "HOO33B",
        status: "read",
        total: 3200,
        type: "bike",
        verificationCode: 126122
    }
)

db.collection("recips").doc("PLL38001").set(
    {
        cash: 30000,
        change: 4800,
        dateFinished: atMoment,
        dateStart: backwardsTime2,
        hours: 10.5553345,
        hqId: "iIJJcbIpMdVeYwEDK6mJ",
        officialEmail: "funcionario@zonap.test",
        paymentStatus: "payed",
        paymentType: "cash",
        phone: "+573017795191",
        plate: "HOO333",
        status: "read",
        total: 25200,
        type: "car",
        verificationCode: 123122
    }
)

db.collection("recips").doc("PLL38002").set(
    {
        cash: 30000,
        change: 4800,
        dateFinished: atMoment,
        dateStart: backwardsTime3,
        hours: 10.5553345,
        hqId: "iIJJcbIpMdVeYwEDK6mJ",
        officialEmail: "funcionario@zonap.test",
        paymentStatus: "payed",
        paymentType: "cash",
        phone: "+573017795191",
        plate: "HOO333",
        status: "read",
        total: 25200,
        type: "car",
        verificationCode: 123122
    }
)

db.collection("metadata").doc("iIJJcbIpMdVeYwEDK6mJ").set({
    hqId: "iIJJcbIpMdVeYwEDK6mJ",
    recipId: {
        numberId: 38002,
        stringId: "PLL"
    },
    shiftClose: 955
}).catch(err => console.log(err))