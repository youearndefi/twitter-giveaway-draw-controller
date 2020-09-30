# Youearn's Twitter Giveaway winners generator
This code will generate 4 winners randomly, the address will be fetched on the Tweet: https://twitter.com/YouearnD/status/1309648638696591360

The code will find the addresses in quote tweets and tweet replies.

All results will be stored in the `results` folder. The results including the executing video, will be uploaded on 10AM00 UTC+0, Sept 29, 2020.

# To run this code

Clone the project. Find and edit the `BEARER_TOKEN` `COOKIE` `CSRF_TOKEN` in `.env` file.

The values you'll find in the header of Twitter's request (using Web dev tool).

Run `npm install && npm run generate`
