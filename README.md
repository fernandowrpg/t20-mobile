# T20 Mobile

Interface touch-first para **Tormenta20** no Foundry VTT. Abra a ficha e dispare
as ações do personagem pelo celular, sem precisar do PC ligado.

O módulo roda **dentro de um cliente Foundry normal**: o celular acessa a mesma
URL de sempre, loga como sempre, e o módulo troca a UI padrão por uma lista de
ações grande e rolável. As rolagens chamam os métodos **nativos do sistema**
(`rollAtributo`, `rollPericia`, `item.roll`, `rollAttack`, `rollDamage`), então os
cards de chat são idênticos aos da ficha — nada é reimplementado.

Não há relay, servidor extra, API key ou autenticação paralela.

## Compatibilidade

| | Versão |
|---|---|
| Foundry VTT | 13 (verificado em 13.351) |
| Sistema `tormenta20` | 1.5.x (desenvolvido contra 1.5.015) |

> **Atenção:** a última release do sistema Tormenta20 compatível com Foundry v13 é a
> **1.5.015**. Da 1.6.0 em diante o `system.json` declara `minimum: 14, maximum: 14`.
> Não atualize o sistema enquanto estiver na v13.

## Instalação

### Pelo Foundry (recomendado)

*Configuração → Add-on Modules → Install Module* e cole esta URL em **Manifest URL**:

```text
https://github.com/fernandowrpg/t20-mobile/releases/latest/download/module.json
```

O Foundry passa a detectar atualizações sozinho a partir daí.

### Manualmente

Baixe o `module.zip` da [release mais recente](https://github.com/fernandowrpg/t20-mobile/releases/latest)
e extraia dentro do diretório de módulos do seu Foundry:

```bash
unzip module.zip -d /caminho/para/FoundryVTT/Data/modules/t20-mobile
```

Depois reinicie o Foundry e ative **T20 Mobile** em *Gerenciar Módulos*, dentro do mundo.

## Uso

No celular, abra a URL normal do seu Foundry e entre no mundo como sempre. O modo
mobile ativa sozinho em telas pequenas com toque.

Para forçar manualmente:

```text
https://seu-foundry.exemplo.com/game?t20m=1
```

Para desativar numa sessão específica, use `?t20m=0`. No desktop, aparece um botão
flutuante "T20" no canto inferior direito para entrar no modo mobile.

Para instalar como app no celular, use "Adicionar à tela de início" no navegador.

### Não carregar a cena no celular

O Foundry só serve o cliente em `/game` — módulos rodam no navegador e não podem
registrar rotas no servidor, então não há uma rota alternativa mais leve.

O que resolve é o **Disable Game Canvas**, uma opção nativa do Foundry em
*Configurar Definições → Core*. Ela é uma configuração de **cliente**: vale por
navegador e aparelho, e existe justamente para que dispositivos fracos entrem no
mundo sem o custo do WebGL. Ligada no celular, a cena nunca é carregada lá, e o
seu PC continua normal.

Na primeira vez que o modo mobile abre, o módulo oferece ligar isso para você.

### Abas

- **Ações** — atributos, armas (Ataque / Dano / Card) e iniciativa.
- **Perícias** — lista filtrável, com o atributo-base e o modificador. Perícias não
  treinadas ficam esmaecidas; as "somente treinada" sem treino ficam tracejadas.
- **Itens** — poderes, magias, consumíveis e equipamentos.
- **Chat** — últimas 25 mensagens, renderizadas pelo próprio Foundry.

O cabeçalho mostra PV/PM com steppers de −1/+1, Defesa e Nível.

## Configurações (por cliente)

| Setting | Padrão | O que faz |
|---|---|---|
| Ativar automaticamente em telas pequenas | ligado | Entra no modo mobile sozinho |
| Mostrar diálogo de uso nas rolagens | desligado | Um toque rola direto; ligado, abre o diálogo de efeitos do sistema |
| Oferecer desligar o canvas neste dispositivo | ligado | Sugere ligar o `Disable Game Canvas` ao entrar no modo mobile |
| Suspender o canvas no modo mobile | ligado | Para o renderizador do mapa quando o canvas está ativo |

### Sobre o diálogo de uso

O sistema T20 decide se abre o diálogo a partir do setting `tormenta20.UsageConfig`
combinado com `event.shiftKey`:

- `UsageConfig === "default"` → precisa de diálogo quando **não** tem shift
- `UsageConfig === "shift"` → precisa de diálogo quando **tem** shift

O módulo sintetiza o `shiftKey` invertido conforme o caso, então a configuração
"Mostrar diálogo de uso" funciona com qualquer valor de `UsageConfig`.

## Limitações conhecidas

- Mostra apenas atores em que você tem permissão de **Owner**.
- Não edita a ficha: é uma superfície de consulta e rolagem. Para editar, saia do
  modo mobile (botão ✕) e use a ficha normal.
- Rolagem de dano de arma lê o resultado do último ataque (`system.rolled.Ataque`)
  para saber se foi crítico, então role o Ataque antes do Dano.
- Com o canvas suspenso, o mapa não atualiza. Saia do modo mobile para voltar a vê-lo.

## Desenvolvimento

Há um harness que roda a UI fora do Foundry, com um mock do `game`/`CONFIG`/ator:

```bash
python3 -m http.server 8731
```

Depois abra `http://127.0.0.1:8731/test/harness.html?t20m=1`.

O mock reproduz os campos reais do `SkillData` do sistema (`treinado`, `atributo`,
`st`, `value`) e lança exceção se `rollAttack` for chamado sem argumento — o método
do sistema desestrutura `{ options }` sem default no objeto externo, então
`item.rollAttack()` quebra e a chamada correta é `item.rollAttack({ options: {} })`.

## Publicando uma nova versão

O release é automático. Para cortar uma versão:

1. Atualize `version` no `module.json`.
2. Registre as mudanças no `CHANGELOG.md`.
3. Faça commit, crie a tag e empurre:

```bash
git commit -am "Release v0.2.0"
```

```bash
git tag v0.2.0
```

```bash
git push origin main --tags
```

O workflow `.github/workflows/release.yml` confere que a tag bate com o `version`
do `module.json`, injeta as URLs de `manifest` e `download`, monta o `module.zip`
e publica a release com os dois arquivos anexados.

Se a tag não bater com o `module.json`, o workflow falha de propósito, antes de
publicar qualquer coisa.

## Divulgando para a comunidade

Com a primeira release no ar, o módulo pode ser enviado para o
[pacote oficial do Foundry](https://foundryvtt.com/packages/submit) usando a mesma
Manifest URL acima. A listagem oficial é o que faz o módulo aparecer na busca
dentro do Foundry.
