require('dotenv').config()
const fetch = require('node-fetch');
const _ = require('lodash')
const fs = require('fs')
const chalk = require('chalk');

const bearerToken = process.env.BEARER_TOKEN; //the Bearer Token, getting on the Header
const cookie = process.env.COOKIE; //the cookie
const tweetId = '1309648638696591360'; //the tweet id https://twitter.com/YouearnD/status/1309648638696591360
const xCsrfToken = process.env.CSRF_TOKEN;
const replyTextList = []
const quoteList = []
const resultFolder = './results'

//function to fetch the replies
function fetchReplies(nextCursor=null){
  let replyCount = 0;
  const fetchURL = `https://api.twitter.com/2/timeline/conversation/${tweetId}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&count=200&include_ext_has_birdwatch_notes=false&ext=mediaStats%2ChighlightedLabel`
  + (nextCursor ? "&include_ext_has_birdwatch_notes=false&cursor="+nextCursor : "");
  return fetch(fetchURL, {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "authorization": "Bearer " + bearerToken,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "x-guest-token": "1310894173369675776",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      "Cookie": cookie,
      "x-csrf-token": xCsrfToken

    },
    "referrer": "https://twitter.com/",
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors"
  }).then(async res => {
    // console.log(res)
    const status = res.status;

    if(status !== 200){
      console.log({
        status,
        text: await res.text()
      })
      throw new Error("An error occurs")
    }

    const json = await res.json();
    const {globalObjects, timeline} = json;
    const {tweets} = globalObjects;
    delete tweets[tweetId];
    _.forEach(tweets, (replyObj, replyId) => {
      replyCount += 1;
      replyTextList.push(replyObj.full_text);
    })
    const {entries} = timeline.instructions[0].addEntries;
    const lastEntry = _.last(entries);
    console.log(`Got ${replyCount} replies`)
    if(lastEntry.entryId.includes('cursor-bottom-')){
      //fetch next page
      return fetchReplies(encodeURIComponent(lastEntry.content.operation.cursor.value))
    }else{
      //completed
      //the total_replies.json will be publish on Github
      fs.writeFile(resultFolder+'/total_replies.json', JSON.stringify(replyTextList), 'utf8', function(){
        console.log('writen all replies to total_replies.json')
      });
      console.log('Total replies: ',replyTextList.length)
      return Promise.resolve(replyTextList)
    }
  })
}

//function to fetch the quote retweets
function fetchQuotedRT(nextCursor=null){
  let quoteCount = 0
  return fetch("https://api.twitter.com/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=quoted_tweet_id%3A"+tweetId+"&vertical=tweet_detail_quote&count=20000&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel" +
    (nextCursor ? '&cursor='+nextCursor : ''), {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": "Bearer " + bearerToken,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-twitter-active-user": "yes",
        "x-twitter-client-language": "en",
        "Cookie": cookie,
        "x-csrf-token": xCsrfToken

      },
      "referrer": "https://twitter.com/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors"
  }).then( async res => {
    const status = res.status;

    if(status !== 200){
      console.log({
        status,
        text: await res.text()
      })
      throw new Error("An error occurs")
    }

    const json = await res.json();
    const {globalObjects, timeline} = json;
    const {tweets} = globalObjects;
    delete tweets[tweetId];
    _.forEach(tweets, (replyObj, replyId) => {
      quoteCount += 1;
      quoteList.push(replyObj.full_text);
    })
    let lastEntry;
    if(timeline.instructions.length === 1){
      const {entries} = timeline.instructions[0].addEntries;
      lastEntry = _.last(entries);
    }else{
      lastEntry = _.last(timeline.instructions)['replaceEntry'].entry;
    }

    console.log(`Got ${quoteCount} quotes`)
    if(lastEntry.entryId.includes('sq-cursor-bottom') && lastEntry.content.operation.cursor.value.length > 0 && quoteCount > 0){
      //fetch next page
      return fetchQuotedRT(encodeURIComponent(lastEntry.content.operation.cursor.value))
    }else{
      // console.log(entries)
      //completed
      //the total_replies.json will be publish on Github
      fs.writeFile(resultFolder+'/total_quotes.json', JSON.stringify(quoteList), 'utf8', function(){
        console.log('writen all quote tweets to total_quotes.json')
      });
      console.log('Total quote tweets: ',quoteList.length)
      return Promise.resolve(quoteList)
    }
  } )
}

function matchTagAtLeast3Friends(text){
  return ((text || '').match(/(\@([a-zA-Z0-9_]+))/) || []).length >= 3
}

function extractETHAddress(text){
  return (((text || '')).match(/(0x([a-zA-Z0-9]{40}))/) || [])[0] || ''
}


Promise.all(
  [
    fetchQuotedRT(),
    fetchReplies()
  ]
).then(([quoteList, replyTextList]) => {
  const combineList = [...quoteList, ...replyTextList];
  const validETHAddressList = [];
  combineList.forEach(text => {
    const ethAddress = extractETHAddress(text)
    if(matchTagAtLeast3Friends(text) && ethAddress.length > 0){
      validETHAddressList.push(ethAddress)
    }

  })
  fs.writeFile(resultFolder+'/valid_eth_address_list.json', JSON.stringify(validETHAddressList), 'utf8', function(){
    console.log('writen all valid eth address list to valid_eth_address_list.json')
  });
  console.log('Total valid ETH address: ',validETHAddressList.length);

  //random 4 winners
  const winnerList = []
  for(let i=0;i<4;i++){
    const _winnerIndex = _.random(0, validETHAddressList.length-1) //check lodash random function https://lodash.com/docs/#random
    const _winner = validETHAddressList[_winnerIndex]
    _.pullAt(validETHAddressList, _winnerIndex) //remove the last winner from validETHAddressList
    winnerList.push(_winner)
  }


  console.log('------------------------------------------------------')
  console.log(chalk.green(`\n🥳🥳🥳 Congratulations 🥳🥳🥳\n`))
  winnerList.forEach((winnerAddress, i) => {
    console.log(`${chalk.cyan(`Winner #${i+1}`)}: ${chalk.green(winnerAddress)}`)
  })
  console.log('------------------------------------------------------')
  //save winners to file
  fs.writeFile(resultFolder+'/winners.json', JSON.stringify(winnerList), 'utf8', function(){
  });

})
