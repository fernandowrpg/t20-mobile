# Changelog

Todas as mudanças relevantes deste módulo são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.1] - 2026-11-19

### Corrigido

- O botão de excluir mensagem no chat não funcionava. Os controles nativos da
  mensagem têm os listeners ligados pelo ChatLog da sidebar, não pelo elemento;
  renderizada solta na aba Chat, a mensagem vinha com os botões mortos. Agora os
  controles nativos ficam escondidos e o módulo oferece o próprio botão
  **Excluir**, que chama `msg.delete()` direto. Ele aparece apenas para o GM ou
  para o autor da mensagem.

### Adicionado

- Ao entrar no modo mobile, o módulo oferece ligar o **Disable Game Canvas** do
  Foundry (`core.noCanvas`), que impede a cena de ser carregada no aparelho. É
  uma configuração de cliente: vale por navegador e não afeta os outros
  jogadores. Nova configuração "Oferecer desligar o canvas neste dispositivo"
  controla a sugestão.
- A aba Chat agora reage a exclusão e edição de mensagens, não só a criação.

## [0.1.0] - 2026-11-19

### Adicionado

- Modo mobile que substitui a UI do Foundry por uma interface touch-first.
- Aba **Ações**: atributos, armas (Ataque / Dano / Card) e iniciativa.
- Aba **Perícias**: lista filtrável com atributo-base e modificador; perícias não
  treinadas esmaecidas e "somente treinada" sem treino marcadas como bloqueadas.
- Aba **Itens**: poderes, magias, consumíveis e equipamentos.
- Aba **Chat**: últimas 25 mensagens renderizadas pelo próprio Foundry.
- Cabeçalho com PV/PM (steppers de −1/+1), Defesa e Nível.
- Troca de ator entre todos os que o usuário tem como Owner, com a escolha
  lembrada por dispositivo.
- Suspensão opcional do canvas para economizar bateria e memória no celular.
- Configuração para abrir ou pular o diálogo de uso do sistema, compatível com
  os dois valores de `tormenta20.UsageConfig`.

[0.1.1]: https://github.com/fernandowrpg/t20-mobile/releases/tag/v0.1.1
[0.1.0]: https://github.com/fernandowrpg/t20-mobile/releases/tag/v0.1.0
