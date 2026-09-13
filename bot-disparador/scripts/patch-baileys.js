import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js');

if (!fs.existsSync(filePath)) {
  console.log('[patch-baileys] Arquivo não encontrado, pulando patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `const sessionDevices = await getUSyncDevices([senderIdentity, jid], true, false);
                        devices.push(...sessionDevices);`;

const patchStr = `const sessionDevices = await getUSyncDevices([senderIdentity, jid], true, false);
                        devices.push(...sessionDevices);
                        // [PATCH DISPARADOR PRO] Ensure primary sender device (phone: device 0) is included for DSM sync to phone
                        const ownUserForAddressing = isLid && meLid ? jidDecode(meLid).user : jidDecode(meId).user;
                        const ownUserServer = isLid ? 'lid' : 's.whatsapp.net';
                        if (!devices.some(d => d.user === ownUserForAddressing && d.device === 0)) {
                            devices.push({
                                user: ownUserForAddressing,
                                device: 0,
                                jid: jidEncode(ownUserForAddressing, ownUserServer, 0)
                            });
                        }
                        const targetUserServer = isLid ? 'lid' : 's.whatsapp.net';
                        if (!devices.some(d => d.user === user && d.device === 0)) {
                            devices.push({
                                user,
                                device: 0,
                                jid: jidEncode(user, targetUserServer, 0)
                            });
                        }`;

if (content.includes('PATCH DISPARADOR PRO')) {
  console.log('[patch-baileys] Baileys já está patcheado com sucesso.');
  process.exit(0);
}

if (!content.includes(targetStr)) {
  console.warn('[patch-baileys] Trecho de código não encontrado para patch.');
  process.exit(0);
}

content = content.replace(targetStr, patchStr);
fs.writeFileSync(filePath, content, 'utf8');
console.log('[patch-baileys] Patch aplicado com sucesso em messages-send.js! Agora mensagens enviadas sincronizam para o celular (device 0).');
