# Análise do Runna (referência de produto)

Feita em 2026-10-17, a pedido do dono, para tirar ideias de produto e de movimento para o Let's Go Run. **Isto é um registro do que foi observado, não uma especificação.** O que virou ideia de melhoria está em `docs/melhorias-futuras.md` (seção 2), e nada lá está aprovado.

## Cuidados que valem para este material

- **Só conceito, nada copiado.** Textos, imagens, animações (Lottie), fontes, ícones e código do Runna são protegidos por direito autoral. Nada disso foi trazido para o repositório e não deve ser reaproveitado.
- **Sem chaves de terceiros.** O pacote do aplicativo traz identificadores de serviços (monitoramento, testes A/B, assinaturas e outros). Não foram copiados nem registrados aqui.
- **Origem do arquivo não verificada.** O APK veio de um site espelho (APK4Fun), com assinatura não conferida. Foi usado só para leitura estática, **não foi instalado** em nenhum aparelho. Para ver o app funcionando, usar a versão da Google Play.
- Os arquivos extraídos ficaram numa pasta temporária fora do projeto.

## O que foi analisado

| Item | Valor |
| --- | --- |
| Pacote | `com.runbuddy.prod`, versão 8.55.0 (versionCode 2076), Android 10 ou mais novo |
| Tamanho | 81,8 MB, 29.153 classes, 1.988 recursos |
| SHA-256 do arquivo | `e58425da349220950acf55513f8b6175c7de9c3ced56a7260f509377a0469ae2` |
| Ferramenta | REA 6.5.0 (servidor MCP no Claude Code), JADX 0.7.1 |
| Tecnologia | Expo / React Native com bytecode Hermes (não é Flutter) |

## O que foi possível ver

- **Nomes de telas e áreas** (mais de 500): hoje, plano, calendário, ritmo e tempo estimado de prova, quilometragem, feriados, redução de treino, recuperação pós-prova, treinos instantâneos, força, zonas de frequência cardíaca, tênis, níveis, adaptação ao clima, entre outras. O mapeamento com um material de divulgação foi feito **só por nome**.
- **Integrações citadas:** Strava, Garmin, Coros, Suunto, Polar, Fitbit, Zepp, Health Connect, Parkrun, previsão do tempo.
- **Pilha de animação:** Lottie, Reanimated (molas e entradas), Skia, Rive, confete e hápticos. Os recursos soltos do pacote são fontes, sons, animações Lottie, ilustrações vetoriais do Skia e cerca de 20 imagens; a maioria das imagens citadas no código **não está no APK** (vem de um servidor).
- **Modos de treino** (Optimal, Balanced, Lifestyle) e um recurso de "não estou 100%".

## O que não foi possível ver

- **Layout final das telas, cores aplicadas e o encadeamento das animações:** estão no bytecode Hermes, que o REA não decompila. O aplicativo precisaria rodar para isso.
- **A lógica dos planos:** roda no servidor do Runna (GraphQL), não está no APK. Qualquer comparação com o nosso motor é por nome de recurso, **não por algoritmo**.

## O que foi aproveitado no Let's Go Run

- **Movimento:** esqueletos de carregamento, cartões entrando em sequência, barras que crescem, entrevista que desliza, menu do celular e troca de página com fade. Tudo em CSS próprio, sem biblioteca (ver "Movimento da interface" no `AGENTS.md`).
- **Ritmo (pace):** mostrado como referência por treino, no registro e no histórico. Não há meta nem regra nova.
- **Ideias registradas, sem aprovação:** redução de carga a pedido, pausa planejada, adaptação ao clima e ritmo-alvo por prova recente (`docs/melhorias-futuras.md`).

## O que não vale copiar

- Subir a carga por desempenho: contraria R-PLN-18 (o plano nunca passa do molde).
- Limite de quilometragem do tênis: sem fonte verificada.
- Força, ioga e pilates como treinos extras: o catálogo já tem `forca-corredor` e `mobilidade`.
- O motor do Let's Go Run já cobre o retorno após pausa (R-PRG-08 e R-PRG-09), a doença aguda (R-SON-16) e a semana de recuperação (R-PRG-07), e em segurança é mais conservador que o que se vê no Runna.

## Se for retomar

Para ver as telas de verdade: o Runna da Google Play num celular com gravação de tela, ou captura por `adb` (exige baixar o `platform-tools`; avisar o dono antes). Os resultados entram aqui, sem copiar imagens ou textos do aplicativo.
