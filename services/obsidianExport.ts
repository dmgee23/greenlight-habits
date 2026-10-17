import * as Linking from 'expo-linking';

export const exportToObsidianViaURI = async (vaultName: string, dateStr: string, markdownContent: string) => {
  const encodedVault = encodeURIComponent(vaultName);
  const encodedFilepath = encodeURIComponent(`Daily Notes/${dateStr}.md`);
  const encodedData = encodeURIComponent(markdownContent);

  const obsidianUrl = `obsidian://advanced-uri?vault=${encodedVault}&filepath=${encodedFilepath}&data=${encodedData}&mode=overwrite`;

  const canOpen = await Linking.canOpenURL(obsidianUrl);

  if (canOpen) {
    await Linking.openURL(obsidianUrl);
  } else {
    console.error('Obsidian Advanced URI is not installed or accessible.');
  }
};