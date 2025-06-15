const FlakeId = require('flake-idgen');
const db = require('../config/db')
const { eq } = require('drizzle-orm')

const flake = new FlakeId({ id: 1 });

const getSupscription = async((req, res) => {

  const userId = req.user.id 
  if( userId != req.i)
  const supData = {
    id,
    userId: req.id,
    subType: 
    content:
    price:
    startAt:
    endAt:
    status:
  }
})