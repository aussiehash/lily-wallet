import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { AES } from 'crypto-js';
import { useHistory } from "react-router-dom";
import Modal from 'react-modal';
import { QRCode } from "react-qr-svg";
import moment from 'moment';

import { MnemonicWordsDisplayer } from '../../components';

import { black, gray, white, blue, darkGray, darkOffWhite, lightBlue, red, lightGray, darkGreen } from '../../utils/colors';
import { mobile } from '../../utils/media';
import { createColdCardBlob, downloadFile } from '../../utils/files';

const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    top: 'auto',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '500px',
    width: '100%',
    minHeight: '500px',
    justifyContent: 'center',
    alignItems: 'center'
  }
}

const VaultSettings = ({ config, setConfigFile, currentAccount, setViewAddresses, setViewUtxos, currentBitcoinNetwork }) => {
  const [viewXpub, setViewXpub] = useState(false);
  const [viewExportQRCode, setViewExportQRCode] = useState(false);
  const [viewMnemonic, setViewMnemonic] = useState(false);
  const [viewDeleteAccount, setViewDeleteAccount] = useState(false);
  const [configEncryptionPassword, setConfigEncryptionPassword] = useState('');
  const history = useHistory();

  const downloadColdcardMultisigFile = () => {
    const ccFile = createColdCardBlob(currentAccount.config.extendedPublicKeys);
    downloadFile(ccFile, "coldcard_import_file.txt");
  }

  const downloadCaravanFile = () => {
    // need to add some properties to our config to use with Caravan
    const configCopy = { ...currentAccount.config };
    configCopy.client = { type: 'public' };
    // need to have a name for each pubkey, so just use parentFingerprint...should use a loop in the future but lazy
    for (let i = 0; i < configCopy.extendedPublicKeys.length; i++) {
      configCopy.extendedPublicKeys[i].name = configCopy.extendedPublicKeys[i].parentFingerprint;
      configCopy.extendedPublicKeys[i].method = 'xpub';
    }
    const caravanFile = new Blob([JSON.stringify(configCopy)], { type: 'application/json' })
    downloadFile(caravanFile, "lily_wallet_caravan_export.json");
  }

  const getMnemonicQrCode = () => {
    return (
      <div>
        <QRCode
          bgColor={white}
          fgColor={black}
          level="Q"
          style={{ width: 256 }}
          value={currentAccount.config.mnemonic}
        />
      </div>
    )
  }

  const getXpubQrCode = () => {
    return (
      <div>
        <QRCode
          bgColor={white}
          fgColor={black}
          level="Q"
          style={{ width: 256 }}
          value={currentAccount.config.xpub}
        />
      </div>
    )
  }

  const getMnemonic = () => {
    return (
      <WordsContainer>
        <MnemonicWordsDisplayer mnemonicWords={currentAccount.config.mnemonic} />
      </WordsContainer>
    )
  }

  const onInputEnter = (e) => {
    if (e.key === 'Enter') {
      removeAccountAndDownloadConfig();
    }
  }

  const removeAccountAndDownloadConfig = () => {
    const contentType = "text/plain;charset=utf-8;";
    const configCopy = { ...config };
    if (currentAccount.config.quorum.requiredSigners === 1) {
      configCopy.wallets = configCopy.wallets.filter((wallet) => wallet.id !== currentAccount.config.id)
    } else {
      configCopy.vaults = configCopy.vaults.filter((vault) => vault.id !== currentAccount.config.id)
    }

    const encryptedConfigObject = AES.encrypt(JSON.stringify(configCopy), configEncryptionPassword).toString();
    const encryptedConfigFile = new Blob([decodeURIComponent(encodeURI(encryptedConfigObject))], { type: contentType });

    downloadFile(encryptedConfigFile, `lily_wallet_config-${moment().format('MMDDYY-hhmmss')}.txt`);
    setConfigFile(configCopy);
    history.push('/');
  }

  return (

    <Wrapper>
      <TotalValueHeader>Settings</TotalValueHeader>
      <SettingsHeadingItem>Vault Data</SettingsHeadingItem>
      <SettingsSection>
        <SettingsSectionLeft>
          <SettingsHeader>Addresses</SettingsHeader>
          <SettingsSubheader>View the addresses associated with this vault</SettingsSubheader>
        </SettingsSectionLeft>
        <SettingsSectionRight>
          <ViewAddressesButton onClick={() => { setViewAddresses(true); }}>View Addresses</ViewAddressesButton>
        </SettingsSectionRight>
      </SettingsSection>
      <SettingsSection>
        <SettingsSectionLeft>
          <SettingsHeader>UTXOs</SettingsHeader>
          <SettingsSubheader>View the UTXOs associated with this vault</SettingsSubheader>
        </SettingsSectionLeft>
        <SettingsSectionRight>
          <ViewAddressesButton onClick={() => { setViewUtxos(true); }}>View UTXOs</ViewAddressesButton>
        </SettingsSectionRight>
      </SettingsSection>
      {/* KBC-TODO: design a good way to display xpubs and fingerprint data here */}
      {currentAccount.config.quorum.totalSigners === 1 && (
        <SettingsSection>
          <SettingsSectionLeft>
            <SettingsHeader>View XPub</SettingsHeader>
            <SettingsSubheader>View the xpub associated with this vault. This can be given to other services to deposit money into your account or create a read-only wallet.</SettingsSubheader>
          </SettingsSectionLeft>
          <SettingsSectionRight>
            <ViewAddressesButton onClick={() => { setViewXpub(true); }}>View XPub</ViewAddressesButton>
          </SettingsSectionRight>

          <Modal
            isOpen={viewXpub}
            onRequestClose={() => setViewXpub(false)}
            style={modalStyles}>
            {getXpubQrCode()}
            <XpubWellWrapper>{currentAccount.config.xpub}</XpubWellWrapper>
          </Modal>
        </SettingsSection>
      )}

      <SettingsHeadingItem>Export Wallet</SettingsHeadingItem>
      {currentAccount.config.quorum.totalSigners === 1 && (
        <SettingsSection>
          <SettingsSectionLeft>
            <SettingsHeader>Connect to BlueWallet</SettingsHeader>
            <SettingsSubheader>View a QR code to import this wallet into BlueWallet</SettingsSubheader>
          </SettingsSectionLeft>
          <SettingsSectionRight>
            <ViewAddressesButton onClick={() => { setViewExportQRCode(true); }}>View QR Code</ViewAddressesButton>
          </SettingsSectionRight>

          <Modal
            isOpen={viewExportQRCode}
            onRequestClose={() => setViewExportQRCode(false)}
            style={modalStyles}>
            {getMnemonicQrCode()}
            <ScanInstructions>Scan this QR code to import this wallet into BlueWallet</ScanInstructions>
          </Modal>
        </SettingsSection>
      )}
      {currentAccount.config.quorum.totalSigners === 1 && (
        <SettingsSection>
          <SettingsSectionLeft>
            <SettingsHeader>View Mnemonic Seed</SettingsHeader>
            <SettingsSubheader>View the mnemonic phrase for this wallet. This can be used to import this wallet data into another application.</SettingsSubheader>
          </SettingsSectionLeft>
          <SettingsSectionRight>
            <ViewAddressesButton onClick={() => { setViewMnemonic(true); }}>View Wallet Mnemonic</ViewAddressesButton>
          </SettingsSectionRight>

          <Modal
            isOpen={viewMnemonic}
            onRequestClose={() => setViewMnemonic(false)}
            style={modalStyles}>

            {getMnemonic()}
          </Modal>


        </SettingsSection>
      )}
      {currentAccount.config.quorum.totalSigners > 1 && (
        <SettingsSection>
          <SettingsSectionLeft>
            <SettingsHeader>Download Coldcard File</SettingsHeader>
            <SettingsSubheader>
              Download the multisig wallet import file for Coldcard and place on microsd card. <br />
              Import via Settings > Multisig > Import from SD.
            </SettingsSubheader>
          </SettingsSectionLeft>
          <SettingsSectionRight>
            <ViewAddressesButton onClick={() => { downloadColdcardMultisigFile(); }}>Download Coldcard File</ViewAddressesButton>
          </SettingsSectionRight>
        </SettingsSection>
      )}
      {currentAccount.config.quorum.totalSigners > 1 && (
        <SettingsSection>
          <SettingsSectionLeft>
            <SettingsHeader>Download Caravan File</SettingsHeader>
            <SettingsSubheader>
              <span>Download this vault's configuration file to use in <UCLink href="https://unchained-capital.com/" target="_blank" rel="noopener noreferrer">Unchained Capital's</UCLink> <UCLink href="https://unchained-capital.github.io/caravan/#/" target="_blank" rel="noopener noreferrer">Caravan</UCLink> multisig coordination software.</span>
            </SettingsSubheader>
          </SettingsSectionLeft>
          <SettingsSectionRight>
            <ViewAddressesButton onClick={() => { downloadCaravanFile(); }}>Download Caravan File</ViewAddressesButton>
          </SettingsSectionRight>
        </SettingsSection>
      )}
      <SettingsHeadingItem>Danger Zone</SettingsHeadingItem>
      <SettingsSection>
        <SettingsSectionLeft>
          <SettingsHeader>Delete Account</SettingsHeader>
          <SettingsSubheader>Remove this account from your list of accounts.</SettingsSubheader>
        </SettingsSectionLeft>
        <SettingsSectionRight>
          <ViewAddressesButton
            style={{ color: red, border: `1px solid ${red}` }}
            onClick={() => {
              setViewDeleteAccount(true)
            }}>Delete Account</ViewAddressesButton>
        </SettingsSectionRight>

        <Modal
          isOpen={viewDeleteAccount}
          onRequestClose={() => setViewDeleteAccount(false)}
          style={{ ...modalStyles, content: { ...modalStyles.content, border: `5px solid ${red}` } }}>

          <DangerText>Danger!</DangerText>

          <DangerSubtext>
            You are about to delete an account from this configuration.
             <br />
             If there are any funds remaining in this account, they will be lost forever.
             </DangerSubtext>
          <EnterPasswordSubtext>If you would like to continue, enter a password to encrypt your updated configuration file.</EnterPasswordSubtext>

          <PasswordInput placeholder="password" autoFocus type="password" value={configEncryptionPassword} onChange={(e) => setConfigEncryptionPassword(e.target.value)} onKeyDown={(e) => onInputEnter(e)} />

          <ViewAddressesButton
            style={{ color: red, border: `1px solid ${red}` }}
            onClick={() => { removeAccountAndDownloadConfig() }}>Delete Account</ViewAddressesButton>
        </Modal>

      </SettingsSection>
    </Wrapper>
  )
}

const DangerText = styled.div`
  font-size: 1.5em;
  text-align: center;
  font-weight: 800;
  color: ${red};
`;

const DangerSubtext = styled.div`
  padding-bottom: 2em;
  text-align: center;
`;

const EnterPasswordSubtext = styled.div`
  color: ${gray};
`;

const Wrapper = styled.div`
  background: ${lightBlue};
  padding: 1.5em;
  box-shadow: rgba(0, 0, 0, 0.15) 0px 5px 15px 0px;
  border-top: solid 11px ${blue};
`;

const PasswordInput = styled.input`
  position: relative;
  border: 1px solid ${darkOffWhite};
  background: ${lightGray};
  padding: .75em;
  text-align: center;
  color: ${darkGray};
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1em;
  border-radius: 4px;
  font-size: 1.5em;
  z-index: 1;
  font-family: 'Montserrat', sans-serif;

  ::placeholder {
    color: ${gray};
  }

  :active, :focused {
    outline: 0;
    border: none;
  }
`;

const UCLink = styled.a`
  color: ${darkGray};
  font-weight: 400;
  text-decoration: none;

  &:visited {
    color: ${darkGray};
  }
`;

const SettingsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15em, 1fr));
  grid-gap: 5em;
  margin: 1em 0;
  justify-content: space-between;
  padding: 1.5em;
  background: ${white};
  border: 1px solid ${darkGray};
  align-items: center;

  ${mobile(css`
    grid-gap: 2em;
  `)};
`;

const SettingsSectionLeft = styled.div`
  grid-column: span 2;

  ${mobile(css`
    grid-column: span 1;
  `)};
`;

const WordsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 1.25em;
  justify-content: center;
`;

const ScanInstructions = styled.div`
  font-size: 0.5em;
  padding: 1.5em 0;
`

const SettingsSectionRight = styled.div``;

const SettingsSubheader = styled.div`
  display: flex;
  font-size: 0.875em;
  color: ${darkGray};
  margin: 8px 0;
`;

const SettingsHeader = styled.div`
  display: flex;
  font-size: 1.125em;
`;

const SettingsHeadingItem = styled.h3`
  font-size: 1.5em;
  margin: 64px 0 0;
  font-weight: 400;
  color: ${darkGray};
`;

const ViewAddressesButton = styled.div`
  border: 1px solid ${blue};
  padding: 1.5em;
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
`;

const TotalValueHeader = styled.div`
  font-size: 36px;
`;

const XpubWellWrapper = styled.div`
  border: 1px solid ${darkOffWhite};
  background: ${lightGray};
  padding: 1.5em;
  color: ${darkGreen};
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1em;
  border-radius: 4px;
  word-break: break-all;
`;

export default VaultSettings;