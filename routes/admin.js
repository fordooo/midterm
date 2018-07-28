//jshint esversion: 6
// "use strict";
require('dotenv').config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const adminPhone = process.env.TWILIO_ADMIN_PHONE;
const customerPhone = process.env.TWILIO_CUSTOMER_PHONE;
const client = require('twilio')(accountSid, authToken);
const moment = require('moment');
moment().format();

const express = require('express');
const router = express.Router();

module.exports = (knex) => {

  // Refactor into smaller query?

  router.get("/", (req, res) => {
    knex("orders")
      .leftJoin("order_foods", "orders.id", "order_foods.order_id").leftJoin("foods", "order_foods.food_id", "foods.id")
      .distinct("orders.id", "orders.name", "orders.phone", "orders.placed_at", "orders.eta", "orders.status")
      .sum("foods.price")
      .orderBy("placed_at", "desc")
      .groupBy("orders.id")
      .then((orders) => {
        knex("orders")
          .leftJoin("order_foods", "orders.id", "order_foods.order_id").leftJoin("foods", "order_foods.food_id", "foods.id")
          .select("orders.id", "foods.name") //.count('order_foods.order_id')
          .orderBy("placed_at", "desc")
          .then((items) => {
            res.json({ orders, items });
          });
      });
  });

  router.put("/", (req, res) => {
    let id = req.body.id;
    let minutes = req.body.minutes;
    let status = req.body.status;
    let timeConfirmed = moment().utcOffset("-0700").add(minutes, 'minutes').format();
    console.log(timeConfirmed);
    let name = req.body.name;
    if (status === "Placed") {
      status = "Confirmed";
    }

    // Updates order info/page and sends SMS to customer
    knex("orders")
      .where({
        id: id
      })
      .update({
        status: status,
        eta: timeConfirmed
      }).then((id) => {
        res.json({ result: 'true' });
      }).error(err => {
        console.error(err);
      });

    // Twilio message to user

    console.log('sending text message');
    client.messages.create({
      from: '+16049016036',
      to: customerPhone,
      body: `Hello ${name}! Your order should be ready for pick up in ${minutes} minutes! View your order status at http://localhost:8080/orders/${id} to know when to pick it up!`
       })
      .then(message => {
        console.log('Reply from Twilio');
        console.log(`ID: ${message.sid}`)
      }).done(console.log('Text sent to client'));

  });

  return router;
};
