import fs from 'fs';
import axios from 'axios';
import { join } from 'path';

const config = {
  name: "plant",
  aliases: ["animal"],
  description: "Buy, water, and sell your plant",
  usage: "<buy/feed/check/sell>",
  cooldown: 6,
  credits: "Xaviateam"
};

const langData = {
  "en_US": {
    "pet.buySuccess": "𝚈𝚘𝚞 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚋𝚘𝚞𝚐𝚑𝚝 𝚊 𝚙𝚕𝚊𝚗𝚝! 🪴 𝚈𝚘𝚞𝚛 𝚙𝚕𝚊𝚗𝚝 𝚠𝚒𝚕𝚕 𝚐𝚛𝚘𝚠 𝚘𝚟𝚎𝚛 𝚝𝚒𝚖𝚎.",
    "pet.buyFailure": "⌜🤦🏻‍♂️⌟ : \n—  You already have a plant!",
    "pet.feedSuccess": "⌜🎍⌟ : — You watered your plant, it will now grow faster.",
    "pet.feedCost": "⌜💰⌟ : \n— Feeding {petName} costs ${feedCost}.",
    "pet.feedFailure": "⌜🙅🏻‍♂️⌟ : \n— You can't water a plant you don't own.",
    "pet.noPet": "⌜🤷🏻‍♂️⌟ : \n— You don't have a plant. Use `plant buy {name} {money}` to get one.",
    "pet.checkInfo": "⌜💁🏻‍♂️⌟ : \n— Your plant {petName} has grown worth ${petValue}💰. Don't forget to water it.",
    "pet.sellSuccess": "⌜💰⌟ : \n— You sold {petName} for ${amount}. Goodbye, little friend!",
    "pet.sellFailure": "⌜🙅🏻‍♂️⌟ : \n—  You can't sell a plant.",
  }
};

let petOwners = new Map();
const GROWTH_INTERVAL = 15 * 60 * 1000; // Slower growth interval (2 hours)
const PATH = join(global.assetsPath, 'plant_owner.json');

function loadPetOwners() {
  try {
    const data = fs.readFileSync(PATH, 'utf8');
    petOwners = new Map(JSON.parse(data));
  } catch (err) {
    console.error('Failed to load pet owners:', err);
  }
}

function savePetOwners() {
  try {
    const data = JSON.stringify([...petOwners]);
    fs.writeFileSync(PATH, data, 'utf8');
  } catch (err) {
    console.error('Failed to save pet owners:', err);
  }
}

function updatePetGrowth() {
  const currentTime = Date.now();
  petOwners.forEach((pet, ownerID) => {
    const growthPercentage = pet.growthFactor || 0.55;
    const elapsedTime = currentTime - pet.lastFed;
    const growthCycles = Math.floor(elapsedTime / GROWTH_INTERVAL);

    if (growthCycles > 0) {
      const newPetValue = Math.floor(pet.value * Math.pow(1 + growthPercentage, growthCycles));
      pet.value = newPetValue;
      pet.lastFed = currentTime;
    }
  });
}

loadPetOwners();

async function onCall({ message, getLang, args }) {
  const feeding = (await axios.get("https://i.ibb.co/WcTGt0v/xva213.gif", {
    responseType: "stream"
  })).data;
  const pets = (await axios.get("https://i.imgur.com/cbBxy9C.jpg", {
    responseType: "stream"
  })).data;
  const { Users } = global.controllers;

  if (!message || !message.body) {
    console.error('Invalid message object!');
    return;
  }

  const { senderID } = message;

  async function decreaseMoney(ownerID, amount) {
    await Users.decreaseMoney(ownerID, amount);
  }

  updatePetGrowth();

  if (args.length === 0 || args[0] === "menu") {
    return message.reply({
      body: "⪨ 𝗣𝗟𝗔𝗡𝗧 𝗠𝗘𝗡𝗨 🎍⪩\n1. `plant buy <plantname> <amount>` » buy a plant.\n2. `plant water` » water your plant.\n3. `plant check` » check your plant's value.\n4. `plant sell` » sell your pet and earn money.",
      attachment: pets
    });
  }

if (args[0] === "buy") {
  if (args.length < 3) {
    return message.reply("⌜💁🏻‍♂️⌟ : — Please provide a valid name and amount for your new plant.");
  }

  if (petOwners.has(senderID)) {
    return message.reply(getLang("pet.buyFailure"));
  }

  const petName = args[1];
  const amount = parseInt(args[2]);

  if (!petName || isNaN(amount) || amount <= 0) {
    return message.reply("⌜💁🏻‍♂️⌟ : \n— Please provide a valid name and amount for your new pet.");
  }

  // Limit the purchase amount to 5 billion
  const maxPurchaseAmount = 50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000; // 5 billion
  if (amount > maxPurchaseAmount) {
    return message.reply("⌜🙅🏻‍♂️⌟ : \n— You can't buy a plant for more than 5 billion.");
  }

  const userBalance = await Users.getMoney(senderID);

  if (userBalance < amount) {
    return message.reply("⌜🙅🏻‍♂️⌟ : \n— You don't have enough balance to buy a plant.");
  }

  petOwners.set(senderID, {
    name: petName,
    value: amount,
    lastFed: Date.now()
  });

  await decreaseMoney(senderID, amount); // Decrease user's money
  savePetOwners();

  const buySuccessMessage = getLang("pet.buySuccess").replace("{petName}", petName);
  return message.reply(buySuccessMessage);
}


  if (args[0] === "water") {
    if (!petOwners.has(senderID)) {
      return message.reply(getLang("pet.noPet"));
    }

    const petData = petOwners.get(senderID);
    const petValue = petData.value;
    const feedCost = 100; // Replace with the actual feed cost value

    if (petValue < feedCost) {
      return message.reply("⌜🤦🏻‍♂️⌟ : \n— You don't have enough value to water your plant.");
    }

    await Users.decreaseMoney(senderID, feedCost);
    petData.value -= feedCost;
    petData.lastFed = Date.now();

    savePetOwners();

    const feedSuccessMessage = getLang("pet.feedSuccess")
      .replace("{petName}", petData.name)
      .replace("{amount}", feedCost);
    return message.reply({
      body: feedSuccessMessage,
      attachment: feeding});
  }

  if (args[0] === "check") {
    if (!petOwners.has(senderID)) {
      return message.reply(getLang("pet.noPet"));
    }

    const petData = petOwners.get(senderID);
    const petValue = petData.value;

    const currentTime = Date.now();
    const elapsedTime = currentTime - petData.lastFed;
    const growthCycles = Math.floor(elapsedTime / GROWTH_INTERVAL);

    const growthFactor = petData.growthFactor || 0.01; // Retrieve growthFactor from petData
    const newPetValue = Math.floor(petValue * Math.pow(1 + growthFactor, growthCycles));

    const ageInMinutes = Math.floor(elapsedTime / (60 * 1000));

    const checkMessage = getLang("pet.checkInfo")
      .replace("{petName}", petData.name)
      .replace("{petValue}", newPetValue)
      .replace("{ageInMinutes}", ageInMinutes)
      .replace("{growthFactor}", growthFactor)
      .replace("{growthCycles}", growthCycles); // Replace the placeholder with the actual value
    return message.reply(checkMessage);
  }

  if (args[0] === "sell") {
    if (!petOwners.has(senderID)) {
      return message.reply(getLang("pet.noPet"));
    }

    const petData = petOwners.get(senderID);
    const petValue = petData.value;

    await Users.increaseMoney(senderID, petValue);
    petOwners.delete(senderID);
    savePetOwners();

    return message.reply(getLang("pet.sellSuccess").replace("{petName}", petData.name).replace("{amount}", petValue));
  }

  return message.reply({
    body: "⪨ 𝗣𝗟𝗔𝗡𝗧 𝗠𝗘𝗡𝗨 🎍⪩\n1. `plant buy <plantname> <amount>` » buy a plant.\n2. `plant water` » water your plant.\n3. `plant check` » check your plant's value.\n4. `plant sell` » sell your pet and earn money.",
  });
}

export default {
  config,
  langData,
  onCall
};

    
