import { describe, expect, it } from 'vitest';
import { SlideMediaController } from './slide-media.controller';

const okResponse = (body: string, type = 'image/webp'): Response =>
  new Response(body, { status: 200, headers: { 'content-type': type } });

const fakeReply = () => {
  const headers: Record<string, string> = {};
  return { headers, setHeader: (name: string, value: string) => void (headers[name] = value) };
};

describe('SlideMediaController', () => {
  it('fetches the slide from Battle Forge and returns its bytes', async () => {
    // Arrange
    const requested: string[] = [];
    const controller = new SlideMediaController('http://bf:8080', async (url) => {
      requested.push(String(url));
      return okResponse('webp-bytes');
    });
    const reply = fakeReply();

    // Act
    const file = await controller.get('0a1b-2c.webp', reply);

    // Assert
    expect(requested).toEqual(['http://bf:8080/media/slides/0a1b-2c.webp']);
    const chunks: Buffer[] = [];
    for await (const chunk of file.getStream()) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe('webp-bytes');
    expect(reply.headers['Content-Type']).toBe('image/webp');
    expect(reply.headers['Cache-Control']).toContain('max-age');
  });

  it.each(['../secret.webp', 'a.png', 'x/y.webp', '..%2Fa.webp', 'UPPER.webp.exe'])(
    'rejects unsafe file name %s without calling Battle Forge',
    async (name) => {
      // Arrange
      let calls = 0;
      const controller = new SlideMediaController('http://bf:8080', async () => {
        calls += 1;
        return okResponse('x');
      });

      // Act
      const act = controller.get(name, fakeReply());

      // Assert
      await expect(act).rejects.toThrow(/invalid/i);
      expect(calls).toBe(0);
    },
  );

  it('answers 404 when Battle Forge has no such slide', async () => {
    // Arrange
    const controller = new SlideMediaController('http://bf:8080', async () => new Response('', { status: 404 }));

    // Act
    const act = controller.get('aa-1.webp', fakeReply());

    // Assert
    await expect(act).rejects.toThrow(/not found/i);
  });

  it('answers 502 when Battle Forge is unreachable', async () => {
    // Arrange
    const controller = new SlideMediaController('http://bf:8080', async () => {
      throw new Error('ECONNREFUSED');
    });

    // Act
    const act = controller.get('aa-1.webp', fakeReply());

    // Assert
    await expect(act).rejects.toMatchObject({ status: 502 });
  });
});
