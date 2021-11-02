const admin =  require('firebase-admin');
const crud = require('../../src/headquarters/crud');

admin.initializeApp({ projectId: 'potato'});

describe('Test for headquarters CRUD', () => {

    it('createHQ should return response 1', async () => {
        
        const params = {
            name: 'Clinica Medellín',
            location: {
                address: "Cr 45 #53-67",
                coordinates: ['-75.124234', '6.3413123'],
            },
            reservationPolitics: 'no-reserve',
            monthlyPolitics: true,
            type: 'potato',
            hourCarPrice: 5400,
            host: 'tablet',
            corporation: 'ZhMcx4cZU41ToFbJEYz2',
            hourBikePrice: 3200,
            monthlyCarUsers: 59,
            monthlyBikeUsers: 11,
            monthlyPolitics: true, 
            monthlyCarPrice: 185700,
            monthlyBikePrice: 76500,
            fractionBikePrice: 1600,
            fractionCarPrice: 3200,
            dailyCarPrice: 25200,
            dailyBikePrice: 15000,
        }

        const result = await crud.createHq(params)
        expect(result.response).toBe(1)
    })

    it('readHQ should return response 1', async () => {

        const params = {
            id: 'iIJJcbIpMdVeYwEDK6mJ',
            name: 'PK Lleras'
        };

        const result = await crud.readHq(params);
        expect(result.response).toBe(1)
    })
})