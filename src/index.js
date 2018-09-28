import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import ethers from 'ethers';
import cors from 'cors';

const app = express()
  .use(express.static('public'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({
    extended: true,
  }))
  .use(cors());

app.post('/request/:address', (req, res) => {
  try {
    const {
      address,
    } = req.params;
    let addressBalance;
    const signingKey = new ethers.SigningKey(process.env.privateKey);
    const faucetAddress = process.env.address;
    axios.get(`http://fusora.herokuapp.com/address/${faucetAddress}/balance`)
      .then((result) => {
        const faucetBalance = result.data.balance.pending;
        if (!res.headersSent) {
          if (faucetBalance < 5000000) {
            return res.status(400).send({
              msg: 'Faucet is Dry',
            });
          }
          axios.get(`http://fusora.herokuapp.com/address/${address}/balance`)
            .then((balance) => {
              addressBalance = balance.data.balance.pending;
              if (addressBalance >= 5000000) {
                return res.status(400).send({
                  msg: 'User is Greedy',
                });
              }
              const dataBytes = ethers.utils.toUtf8Bytes('');
              const dataDigest = ethers.utils.keccak256(dataBytes);
              const senderSignature = signingKey.signDigest(dataDigest);
              const transaction = {
                from: signingKey.address,
                to: address,
                value: 5000000,
                fee: 91000,
                dateCreated: new Date().toISOString(),
                data: '',
                senderPubKey: signingKey.publicKey,
                senderSignature,
              };
              axios
                .post('http://fusora.herokuapp.com/transactions/send', transaction, {
                  responseType: 'json',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                  },
                })
                .then((successTransaction) => {
                  return res.status(200).send({
                    transaction: successTransaction.data,
                  });
                })
                .catch((err) => {
                  return res.status(400).send({
                    msg: 'Transaction failed',
                  });
                });
            });
        }
      });
  } catch (err) {
    res.status(400).send(err);
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`On HTTP_PORT: http://localhost:${PORT}`);
});
