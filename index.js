/**
 * @author mason
 */
const banner = `
 █     █░▓█████  ██▓     ▄████▄   ▒█████   ███▄ ▄███▓▓█████ 
▓█░ █ ░█░▓█   ▀ ▓██▒    ▒██▀ ▀█  ▒██▒  ██▒▓██▒▀█▀ ██▒▓█   ▀ 
▒█░ █ ░█ ▒███   ▒██░    ▒▓█    ▄ ▒██░  ██▒▓██    ▓██░▒███   
░█░ █ ░█ ▒▓█  ▄ ▒██░    ▒▓▓▄ ▄██▒▒██   ██░▒██    ▒██ ▒▓█  ▄ 
░░██▒██▓ ░▒████▒░██████▒▒ ▓███▀ ░░ ████▓▒░▒██▒   ░██▒░▒████▒
░ ▓░▒ ▒  ░░ ▒░ ░░ ▒░▓  ░░ ░▒ ▒  ░░ ▒░▒░▒░ ░ ▒░   ░  ░░░ ▒░ ░
  ▒ ░ ░   ░ ░  ░░ ░ ▒  ░  ░  ▒     ░ ▒ ▒░ ░  ░      ░ ░ ░  ░
  ░   ░     ░     ░ ░   ░        ░ ░ ░ ▒  ░      ░      ░   
    ░       ░  ░    ░  ░░ ░          ░ ░         ░      ░  ░
                        ░                                   
`;

console.log(banner);
const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

class HTTPClient {
  constructor() {
    this.axios = axios.create({
      headers: {
        'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) CustomBrowser/1.0',
        'Referer': 'https://store.steampowered.com/',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
      }
    });
  }

  async request(method, url, data, headers) {
    try {
      const response = await this.axios.request({
        method,
        url,
        data,
        headers
      });

      if (response.status < 400) {
        return response;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log("Rate limited. Sleeping for 10 seconds!");
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.request(method, url, data, headers);
      } else {
        console.error(`Bad request: ${error.response.status} ${error.response.statusText}`);
      }
    }
  }
}

async function getCleanWordlist() {
  try {
    const data = await readFileAsync('words.txt', 'utf8');
    const words = data.split('\n').map(word => word.trim());
    const uniqueWords = [...new Set(words)];
    return uniqueWords.sort();
  } catch (error) {
    console.error(`Error reading 'words.txt': ${error.message}`);
    return [];
  }
}

async function checkUsernames(httpClient) {
  const base_url = "https://steamcommunity.com/id/";
  const wordlist = await getCleanWordlist();

  console.log(`Checking ${wordlist.length} usernames.`);

  const availableUsernames = [];

  for (const word of wordlist) {
    const url = base_url + word;
    const response = await httpClient.request('GET', url);
    if (!response) {
      continue;
    }
    if (response.data.includes("The specified profile could not be found.")) {
      console.log(`Username ${greenText(`${word} is available`)}!`);
      availableUsernames.push(word);
    } else {
      console.log(`Username ${redText(`${word} is not available`)}!`);
    }
  }

  if (availableUsernames.length > 0) {
    const availableWordsText = availableUsernames.join('\n');
    try {
      await writeFileAsync('available_words.txt', availableWordsText, 'utf8');
      console.log(`Available usernames saved to available_words.txt.`);
    } catch (error) {
      console.error(`Error writing to available_words.txt: ${error.message}`);
    }
  }
}

function greenText(text) {
  return `\x1b[32m${text}\x1b[0m`;
}

function redText(text) {
  return `\x1b[31m${text}\x1b[0m`;
}

(async () => {
  const httpClient = new HTTPClient();
  console.log("Reading username wordlist...");
  const wordlist = await getCleanWordlist();
  console.log("Checking usernames...");

  if (wordlist.length > 0) {
    console.log(`Found ${wordlist.length} usernames to check...`);
    await checkUsernames(httpClient);
  }
})();