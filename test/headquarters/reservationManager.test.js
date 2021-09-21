const reservationManager = require('../../src/headquarters/reservationManager')
const { mockFirebase }  = require('firestore-jest-mock')
const admin = require("firebase-admin");


beforeAll(() => {

    const serviceAccount = require("./service_account_dev.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://zona-p-test.firebaseio.com",
    });
 
    mockFirebase({
        database: {
            headquarters: {
                iIJJcbIpMdVeYwEDK6mJ: {
                    reservations: [
                        {
                            cash: 0,
                            change: 0,
                            dateStart: '2021-09-14T19:15:46.309Z',
                            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
                            officialEmail: 'funcionario@zonap.test',
                            phone: '+573017795191',
                            plate: 'HOO33B',
                            prepayFullDay: false,
                            type: 'bike',
                            verificationCode: 121412
                        },
                        {
                            cash: 0,
                            change: 0,
                            dateStart: '2021-09-14T19:15:46.309Z',
                            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
                            officialEmail: 'funcionario@zonap.test',
                            phone: '+573017795192',
                            plate: 'HOO333',
                            prepayFullDay: false,
                            type: 'car',
                            verificationCode: 121413
                        }
                    ]
                },
                
            }
        }
    })

});

describe('Test for checkParking function', () => {
    
    it('A bikeFraction it should return 1600 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795191",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(1600)
    });

    it('A bikeHour it should return 3200 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795191",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(3200)
    });

    it('A bike Hour+Fraction it should return 4800 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795191",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4800)
    });

    it('A bikeDay it should return 15000 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795191",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(15000)
    });

    it('A carFraction it should return 2700 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(2700)
    });

    it('A carHour it should return 5400 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(5400)
    });

    it('A car Hour+Fraction it should return 8100 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(8100)
    });

    it('A carDay it should return 25200 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(25200)
    });
});


describe('we can query', () => {
    mockFirebase({
        database: {
            headquarters: {
                iIJJcbIpMdVeYwEDK6mJ: {
                    reservations: [
                        {
                            cash: 0,
                            change: 0,
                            dateStart: '2021-09-14T19:15:46.309Z',
                            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
                            officialEmail: 'funcionario@zonap.test',
                            phone: '+573017795191',
                            plate: 'HOO33B',
                            prepayFullDay: false,
                            type: 'bike',
                            verificationCode: 121412
                        },
                        {
                            cash: 0,
                            change: 0,
                            dateStart: '2021-09-14T19:15:46.309Z',
                            hqId: 'iIJJcbIpMdVeYwEDK6mJ',
                            officialEmail: 'funcionario@zonap.test',
                            phone: '+573017795192',
                            plate: 'HOO333',
                            prepayFullDay: false,
                            type: 'car',
                            verificationCode: 121413
                        }
                    ]
                },
                
            }
        }
    })

    const firestore = admin.firestore()
    let db = firestore.collection('headquarters');

    console.log('MOOOOOOOCK', db.firestore.database.headquarters.iIJJcbIpMdVeYwEDK6mJ.reservations[0].phone)
    test('db',() => {

        // Assert that we call the correct firestore methods
        expect(db.firestore.database.headquarters.iIJJcbIpMdVeYwEDK6mJ.reservations[0].phone).toBe('+573017795191');
    });

    // test('A carDay it should return 25200 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+573017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(25200)

});