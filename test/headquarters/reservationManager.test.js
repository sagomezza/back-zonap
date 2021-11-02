const reservationManager = require('../../src/headquarters/reservationManager')
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "potato" });

//-----------TEST CHECKPARKING FOR PK LLERAS--------
describe('Test for checkParking function for PK Lleras', () => {
    jest.setTimeout(10000);

    //--------------BIKES-----------------
    it('Bike park less than 5 minutes it should return 0', async () => {
        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795190",
            "plate":"HOO33Z"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(0)
    })

    it('A bikeFraction it should return 1600 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795191",
            "plate":"HOO33A"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(1600)
    });

    it('A bikeHour it should return 3200 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(3200)
    });

    it('A bike Hour+Fraction it should return 4800 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795193",
            "plate":"HOO33C"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4800)
    });

    it('A bikeDay it should return 15000 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795194",
            "plate":"HOO33D"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(15000)
    });
    //--------------CARS-----------------
    it('Car park less than 5 minutes it should return 0', async () => {
        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795100",
            "plate":"HOO330"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(0)
    })

    it('A carFraction it should return 2700 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795195",
            "plate":"HOO33E"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(2700)
    });

    it('A carHour it should return 5400 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795196",
            "plate":"HOO33F"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(5400)
    });

    it('A car Hour+Fraction it should return 8100 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795197",
            "plate":"HOO33G"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(8100)
    });

    it('A carDay it should return 25200 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795198",
            "plate": "HOO33H"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(25200)
    });
});

//---------------TETS WITH COUPONS---------------

describe('Test for checkParking function with coupon for PK Lleras', () => {
    
    it('A bikeFraction with coupon it should return 750 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795181",
            "plate":"GOO33A"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(750)
    });

    it('A bikeHour with coupon it should return 1500 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795182",
            "plate":"GOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(1500)
    });

    it('A bike Hour+Fraction with coupon it should return 2250 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795183",
            "plate":"GOO33C"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(2250)
    });

    it('A bikeDay with coupon it should return 4500 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795184",
            "plate":"GOO33D"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4500)
    });

    it('A carFraction with coupon it should return 1500 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795185",
            "plate":"GOO33E"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(1500)
    });

    it('A carHour with coupon it  should return 3000 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795186",
            "plate":"GOO33F"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(3000)
    });

    it('A car Hour+Fraction with couponit should return 4500 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795187",
            "plate":"GOO33G"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4500)
    });

    it('A carDay with coupon it should return 9000 total ', async () => {

        const parameter = {
            "hqId": "iIJJcbIpMdVeYwEDK6mJ",
            "phone": "+563017795188",
            "plate": "GOO33H"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(9000)
    });
});

//------------TEST CHECKPARKING FOR CLINICA MEDELLIN-----------
describe('Test for checkParking function for Clínica Medellín Sótano', () => {
    
    //--------------BIKES-----------------
    it('Bike parked less than an hour should return 2100', async () => {
        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795190",
            "plate":"HOO33Z"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(2100)
    })

    it('Bike parked at least 1 hour and less than 1:15 should return 2600', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795191",
            "plate":"HOO33A"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(2600)
    });

    it('Bike parked at least 1:15 and less than 1:30 should return 3100', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795192",
            "plate":"HOO33B"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(3100)
    });

    it('Bike parked at least 1:30 and less than 1:45 should return 3500 ', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795193",
            "plate":"HOO33C"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(3500)
    });

    it('Bike parked at least 1:45 and less than 2 hours should return 4200', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795194",
            "plate":"HOO33D"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4200)
    });

    it('Bike parked at least 2: and less than 2:15 hours should return 4700', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795134",
            "plate":"HOO33T"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4700)
    });

    it('Bike parked a day should return 10500', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017791134",
            "plate":"HOO33V"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(10500)
    });

    it('Bike parked 4:45+ hours should return 10500', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017792134",
            "plate":"HOO33X"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(10500)
    });

    it('Bike parked one day and fraction should return 12600', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017799134",
            "plate":"HOO33Y"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(12600)
    });

    it('Bike parked less than half hour with validator should return 0', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017799130",
            "plate":"HOO33Q"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(0)
    });

    it('Bike parked more than half hour with validator should return 2100', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563027799130",
            "plate":"HOO33R"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(2100)
    });

    //----------------CARS------------------
    it('Car parked less than an hour should return 4300', async () => {
        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795100",
            "plate":"HOO330"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(4300)
    })

    it('Car parked at least 1 hour and less than 1:15 should return 5400', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795195",
            "plate":"HOO33E"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(5400)
    });

    it('Car parked at least 1:15 hour and less than 1:30 should return 6500', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795196",
            "plate":"HOO33F"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(6500)
    });

    it('Car parked at least 1:30 hour and less than 1:45 should return 7600', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795197",
            "plate":"HOO33G"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(7600)
    });

    it('Car parked at least 1:45 hour and less than 2 hours should return 8600', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795198",
            "plate": "HOO33H"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(8600)
    });

    it('Car parked at least 2:00 hour and less than 2:15 hours should return 9700', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017795128",
            "plate": "HOO331"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(9700)
    });
    it('Car parked a > 4:45 hours should return 21500', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017791128",
            "plate": "HOO321"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(21500)
    });

    it('Car parked 4:45+ should return 21500', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017792128",
            "plate": "HOO322"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(21500)
    });

    it('Car parked one day and fraction should return 25800', async () => {

        const parameter = {
            "hqId": "kPlPR3Rysv3uCsrUdcn2",
            "phone": "+563017793128",
            "plate": "HOO332"
        }

        const result = await reservationManager.checkParking(parameter)
        expect(result.data.total).toBe(25800)
    });
});

describe("Test for startParking function", () => {

    it("startParkgin car hours should return response: 1", async () =>{

        const parameter = {
            plate: "CCC000",
            hqId: "iIJJcbIpMdVeYwEDK6mJ",
            dateStart: new Date(),
            phone: "+573017795191",
            prepayFullDay: false,
            officialEmail: "funcionario@test.com",
            type: "car",
            cash: 0,
            change: 0
          }
        
        const result = await reservationManager.startParking(parameter);
        console.log(result);
        expect(result.response).toBe(1)
    });
});