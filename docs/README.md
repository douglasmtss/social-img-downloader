# Documentação Técnica

Esta pasta contém a documentação técnica do projeto Social Image Downloader.

## Conteúdo
- Arquitetura da aplicação
- Decisões de design
- Implementações específicas de funcionalidades
- Manual do usuário
- Detalhes sobre o Service Worker (PWA)

### Service Worker (sw.js)
O Service Worker é responsável por tornar o app instalável e permitir funcionamento offline. Ele só é registrado em produção para evitar conflitos em desenvolvimento. O arquivo está em `public/sw.js` e intercepta apenas requests do mesmo domínio, servindo do cache se possível.

Para atualizar ou depurar o Service Worker, consulte a documentação do Next.js e do PWA.
