const StellarSdk = require('stellar-sdk');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🎓 EduPass - Stellar Issuer Account Creator\n');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    const network = await question('Select network (1=Testnet, 2=Public): ');
    const useTestnet = network === '1';

    console.log(`\nUsing ${useTestnet ? 'TESTNET' : 'PUBLIC'} network\n`);

    // Generate keypair
    const keypair = StellarSdk.Keypair.random();
    
    console.log('✅ Keypair generated:\n');
    console.log(`Public Key:  ${keypair.publicKey()}`);
    console.log(`Secret Key:  ${keypair.secret()}\n`);
    console.log('⚠️  IMPORTANT: Save these keys securely! You\'ll need them in your .env file.\n');

    if (useTestnet) {
      const shouldFund = await question('Fund account on testnet with Friendbot? (y/n): ');
      
      if (shouldFund.toLowerCase() === 'y') {
        console.log('\nFunding account...');
        
        const response = await fetch(
          `https://friendbot.stellar.org?addr=${encodeURIComponent(keypair.publicKey())}`
        );
        
        if (response.ok) {
          console.log('✅ Account funded successfully!\n');
          
          // Check balance
          const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
          const account = await server.loadAccount(keypair.publicKey());
          
          console.log('Account Details:');
          console.log(`Balance: ${account.balances[0].balance} XLM`);
          console.log(`Sequence: ${account.sequence}\n`);
        } else {
          console.log('❌ Failed to fund account. Please try again or fund manually.\n');
        }
      }
    } else {
      console.log('⚠️  For PUBLIC network:');
      console.log('1. Send at least 2 XLM to the public key from an exchange or wallet');
      console.log('2. Wait for confirmation (usually a few seconds)');
      console.log('3. Verify at: https://stellar.expert/explorer/public\n');
    }

    console.log('📝 Add these to your backend/.env file:\n');
    console.log(`STELLAR_NETWORK=${useTestnet ? 'testnet' : 'public'}`);
    console.log(`ISSUER_PUBLIC_KEY=${keypair.publicKey()}`);
    console.log(`ISSUER_SECRET_KEY=${keypair.secret()}`);
    console.log(`ASSET_CODE=EDUPASS\n`);

    console.log('🔗 Useful links:');
    if (useTestnet) {
      console.log(`   Account: https://stellar.expert/explorer/testnet/account/${keypair.publicKey()}`);
      console.log('   Laboratory: https://laboratory.stellar.org/#explorer?network=test\n');
    } else {
      console.log(`   Account: https://stellar.expert/explorer/public/account/${keypair.publicKey()}`);
      console.log('   Laboratory: https://laboratory.stellar.org/#explorer?network=public\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
