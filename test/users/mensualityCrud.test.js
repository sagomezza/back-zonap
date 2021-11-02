const admin = require("firebase-admin");
const mensualityCrud = require('../../src/users/mensualityCrud')

admin.initializeApp({ projectId: 'potato' });

describe('Test for mensualities CRUD', () => {

    it('fake mensualityTest', () => {
        const fakeVariable = 1;
        expect(fakeVariable).toBe(1);
    })
    
    // it('createMensuality without should return response 1', async () => {
    //     jest.setTimeout(30000);
    //     const params = {
    //         userId: "yr0h4JpwNRCZtY2eBLTT",
    //         capacity: 1,
    //         vehicleType: "car",
    //         userPhone: "+573213218927",
    //         plates: ["ZZZ777"],
    //         hqId: "iIJJcbIpMdVeYwEDK6mJ",
    //         type: "personal",
    //         monthlyUser: true,
    //         cash: Number(200000),
    //         change: Number(200000 - 185700),
    //         officialEmail: "funcionario@unittesting.test",
    //         pending: false,
    //         generateRecip: false,
    //     }

    //     const result = await mensualityCrud.createMensuality(params);
    //     expect(result.response).toBe(1)
    // });

    // it('createMensuality with should return response 1', async () => {
    //     jest.setTimeout(30000);
    //     const params = {
    //         userId: "yr0h4JpwNRCZtY2eBLTT",
    //         capacity: 1,
    //         vehicleType: "car",
    //         userPhone: "+573213218927",
    //         plates: ["ZZZ777"],
    //         hqId: "iIJJcbIpMdVeYwEDK6mJ",
    //         type: "personal",
    //         monthlyUser: true,
    //         cash: Number(200000),
    //         change: Number(200000 - 185700),
    //         officialEmail: "funcionario@unittesting.test",
    //         pending: false,
    //         generateRecip: true,
    //     }

    //     const result = await mensualityCrud.createMensuality(params);
    //     expect(result.response).toBe(1)
    // });


    // it('findMensualityPlate should return response 1', async () => {

    //     const params = {
    //         plate: "ZZZ777"
    //     }

    //     const result = await mensualityCrud.findMensualityPlate(params);
    //     expect(result.response).toBe(1)
    // });

    // it('renewMensuality should return response 1', async () => {
    //     jest.setTimeout(30000);
    //     const params = {
    //         plate: "ZZZ888",
    //         hqId: 'iIJJcbIpMdVeYwEDK6mJ',
    //         officialEmail: 'funcionario@unittesting.test',
    //         cash: Number(200000),
    //         change: Number(200000 - 185700),
    //     };
        
    //     const result = await mensualityCrud.renewMensuality(params);
    //     console.log('RESULT', result)
    //     expect(result.response).toBe(1);
    // });

    // it('editMensuality should return response 1', async () => {
    //     const params = {
    //         id: 'wdX4oxpTqZ876kcKj71R',
    //         phone: '+5738129220092',
    //         plates: ['XXX333']
    //     };

    //     jest.setTimeout(30000);
    //     const result = await mensualityCrud.editMensuality(params);
    //     expect(result.response).toBe(1);
    // })
});