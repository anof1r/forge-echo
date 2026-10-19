export interface Environment {
  port: number;
  battleForgeUrl: string;
}

export function readEnvironment(env: Record<string, string | undefined> = process.env): Environment {
  return {
    port: readPort(env['PORT']),
    battleForgeUrl: readBattleForgeUrl(env['BATTLE_FORGE_URL']),
  };
}

function readPort(value: string | undefined): number {
  if (value === undefined || value === '') return 8081;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, received "${value}".`);
  }
  return port;
}

function readBattleForgeUrl(value: string | undefined): string {
  const url = value === undefined || value === '' ? 'http://localhost:8080' : value;
  if (!/^https?:\/\/[^\s/]+/i.test(url)) {
    throw new Error(`BATTLE_FORGE_URL must be an http(s) URL, received "${url}".`);
  }
  return url.replace(/\/+$/, '');
}
