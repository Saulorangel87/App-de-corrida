// Textos jurídicos do Let's Go Run (proposta aprovada pelo dono em 2026-10-11; fonte e conferência:
// docs/textos-legais.md). Descrevem o que o app faz hoje: quem alterar o tratamento de dados
// (novo provedor, novo dado coletado, nova integração) deve atualizar estes textos e LEGAL_VERSION
// no mesmo commit, e manter `termsVersion` da API (apps/api/src/config.ts) igual a LEGAL_VERSION.

export const LEGAL_VERSION = "2026-10-11";
export const LEGAL_UPDATED_LABEL = "11 de outubro de 2026";
export const LEGAL_CONTACT_EMAIL = "sauloleonardo1987@gmail.com";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  after?: string[];
};

export type LegalDocument = {
  title: string;
  kicker: string;
  intro: string;
  sections: LegalSection[];
};

export const PRIVACY_POLICY: LegalDocument = {
  kicker: "PRIVACIDADE",
  title: "Política de Privacidade",
  intro:
    "Esta política explica quais dados o Let's Go Run guarda sobre você, para que usa cada um, com quem compartilha e como você os controla. Ela segue a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
  sections: [
    {
      id: "responsavel",
      title: "Quem é o responsável pelos seus dados",
      paragraphs: [
        "O Let's Go Run é desenvolvido e operado por Saulo Rangel, que decide como os dados são tratados (controlador, na LGPD).",
        `Para qualquer pedido ou dúvida sobre seus dados, escreva para ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: "dados",
      title: "Quais dados coletamos",
      paragraphs: ["Coletamos apenas o que você informa ou gera ao usar o app:"],
      items: [
        "Conta: nome, e-mail, senha (guardada somente como hash irreversível, nunca em texto), idioma escolhido e as datas de criação da conta e de confirmação do e-mail.",
        "Perfil: mês e ano de nascimento (não guardamos o dia), sexo, altura e peso.",
        "Histórico de corrida e rotina: tempo de prática, treinos e volume por semana, maior corrida recente, tempos de 5 km e 10 km quando você informa, objetivo (distância e data de prova), disponibilidade na semana, sono e estresse habituais, tipo de trabalho, outros esportes, treino de força e recursos (relógio de frequência cardíaca, pista, esteira, tipo de terreno).",
        "Saúde, que são dados pessoais sensíveis: as respostas Sim ou Não do questionário PAR-Q+, gravidez, lesões e dor atual, o resultado da triagem, a avaliação profissional que você declarar (resultado, data e quem avaliou; não pedimos documentos), pausas por dor, lesão ou doença, e o aviso de mudança de saúde. Não guardamos o texto livre do PAR-Q+ (condições e medicamentos).",
        "Acompanhamento diário: check-ins (horas e qualidade do sono, energia, humor, estresse, dor muscular, frequência cardíaca de repouso, doença aguda, dor ao caminhar) e dores registradas (local do corpo, intensidade, tipo e sintomas associados).",
        "Treinos: plano, sessões, se foram feitas, duração, distância, esforço percebido e comentário.",
        "Decisões do app: para cada ajuste de treino, guardamos a regra aplicada e a versão dela, para que você possa ver por que o treino foi mantido, reduzido ou trocado por descanso.",
        "Registro do aceite: a data e a versão dos Termos de Uso e da Política de Privacidade que você aceitou, o consentimento para tratar dados de saúde e a declaração de que tem 18 anos ou mais.",
        "Dados técnicos: um cookie de sessão; o navegador e o sistema de cada sessão aberta (para você reconhecer seus aparelhos); o idioma, no armazenamento do navegador; e o endereço IP, usado para limitar tentativas de acesso indevido. A rede e o servidor podem registrar IP e horário por segurança.",
      ],
    },
    {
      id: "finalidades",
      title: "Para que usamos e em que base legal",
      items: [
        "Montar e ajustar seus treinos, registrar sua evolução e mostrar os resultados: execução do serviço que você pediu (LGPD, art. 7º, V).",
        "Tratar seus dados de saúde para tornar os treinos mais seguros (por exemplo, reduzir ou suspender a carga diante de dor ou sono ruim): seu consentimento específico, dado ao criar a conta e ao informar esses dados (art. 11, I). Você pode retirá-lo a qualquer momento encerrando a conta, já que os treinos dependem desses dados.",
        "Manter o serviço seguro, limitar tentativas de acesso indevido e investigar abusos: interesse legítimo (art. 7º, IX).",
        "Cumprir obrigações legais, quando houver.",
      ],
      after: [
        "Não usamos seus dados para publicidade, não os vendemos e não montamos perfil comercial.",
        "Os treinos são montados por regras de planejamento do app, baseadas em estudos científicos citados em cada treino. Nenhuma inteligência artificial gera ou altera seus treinos. As regras só podem manter ou reduzir a carga; você decide se faz, pula ou registra cada sessão. Se quiser a revisão de uma decisão automatizada, peça pelo contato acima.",
        "O Let's Go Run não faz diagnóstico nem tratamento médico.",
      ],
    },
    {
      id: "compartilhamento",
      title: "Com quem compartilhamos",
      paragraphs: [
        "Usamos prestadores de serviço (operadores) que tratam dados em nosso nome e só para o serviço combinado:",
      ],
      items: [
        "Hospedagem: servidor virtual em nuvem, onde ficam o aplicativo e o banco de dados, e a Cloudflare, que hospeda a interface do app e transporta o tráfego entre o seu aparelho e o servidor.",
        "E-mail transacional (Resend): recebe seu e-mail, seu nome e o texto das mensagens de confirmação de e-mail, de redefinição de senha e de aviso de segurança.",
        "Cópia de segurança: cópias do banco de dados, criptografadas antes de sair do servidor, em armazenamento externo da Oracle. A Oracle guarda apenas o conteúdo já criptografado.",
      ],
      after: [
        "Cloudflare, Resend e Oracle podem tratar dados fora do Brasil. Nesses casos, a transferência é necessária para prestar o serviço (LGPD, art. 33, IX).",
        "Não compartilhamos seus dados com anunciantes nem com outros usuários. Só os divulgamos a autoridades quando a lei exigir.",
      ],
    },
    {
      id: "retencao",
      title: "Por quanto tempo guardamos",
      items: [
        "Seus dados ficam guardados enquanto a conta existir.",
        "Ao excluir a conta em Configurações, apagamos todos os seus dados do banco de dados na hora, sem intervenção de ninguém.",
        "As cópias de segurança anteriores à exclusão permanecem criptografadas por até 30 dias e depois são descartadas automaticamente. Depois desse prazo, seus dados não existem mais em nenhuma cópia.",
        "Registros técnicos de acesso ficam pelo tempo necessário para segurança.",
      ],
    },
    {
      id: "direitos",
      title: "Seus direitos",
      paragraphs: ["Você pode, a qualquer momento e sem custo (LGPD, art. 18):"],
      items: [
        'Confirmar e acessar seus dados: em Configurações, "Baixar meus dados" entrega um arquivo com tudo que guardamos sobre você, inclusive os dados de saúde.',
        "Corrigir dados: refazendo a entrevista, e reenviando o check-in ou o registro de um treino (o novo substitui o anterior).",
        "Levar seus dados a outro serviço: o arquivo baixado é JSON, um formato aberto.",
        'Apagar seus dados: em Configurações, "Excluir minha conta".',
        "Saber com quem compartilhamos dados: na seção acima.",
        "Retirar o consentimento e pedir a revisão de decisões automatizadas: pelo contato abaixo.",
      ],
      after: [
        `Para o que não puder fazer sozinho, escreva para ${LEGAL_CONTACT_EMAIL}. Respondemos em até 15 dias.`,
        "Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.",
      ],
    },
    {
      id: "seguranca",
      title: "Como protegemos seus dados",
      items: [
        "Conexão criptografada (HTTPS) entre o seu aparelho e o servidor.",
        "Senhas guardadas com hash argon2id; o cookie de sessão é HttpOnly, seguro e protegido contra envio entre sites.",
        "Cada conta só acessa os próprios dados, com isolamento também no banco de dados; o banco não é acessível pela internet.",
        "A sessão expira por inatividade e tem prazo máximo; você pode encerrar as sessões abertas em outros aparelhos.",
        "Limite de tentativas em login, cadastro e redefinição de senha, com bloqueio temporário após várias senhas erradas.",
        "Cópias de segurança criptografadas.",
      ],
      after: [
        "Nenhum sistema é totalmente seguro. Se ocorrer um incidente que possa causar risco ou dano relevante a você, avisaremos você e a ANPD, como a lei determina (art. 48).",
      ],
    },
    {
      id: "cookies",
      title: "Cookies e armazenamento no aparelho",
      paragraphs: [
        "Usamos um cookie essencial, que mantém você conectado. Guardamos no armazenamento do navegador apenas o idioma escolhido (português ou inglês), que não contém dados pessoais. Não usamos cookies de publicidade, ferramentas de análise de terceiros, nem carregamos scripts, fontes ou imagens de outros sites.",
      ],
    },
    {
      id: "menores",
      title: "Crianças e adolescentes",
      paragraphs: [
        "O Let's Go Run é destinado a pessoas com 18 anos ou mais. Se identificarmos uma conta de menor, apagaremos os dados.",
      ],
    },
    {
      id: "mudancas",
      title: "Mudanças nesta política",
      paragraphs: [
        "Quando mudarmos algo que afete seus dados, como um novo provedor ou um novo tipo de dado, atualizamos esta página e a data no topo, e avisamos no app antes de a mudança valer. Um novo uso que exija novos dados só começa com o seu consentimento.",
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  kicker: "TERMOS",
  title: "Termos de Uso",
  intro:
    "Estes termos valem para o uso do Let's Go Run, um aplicativo de planejamento de treino de corrida. Ao criar uma conta, você declara que leu e concorda com eles e com a Política de Privacidade.",
  sections: [
    {
      id: "elegibilidade",
      title: "Quem pode usar",
      paragraphs: [
        "O Let's Go Run é destinado a pessoas com 18 anos ou mais. A conta é pessoal e você deve informar dados verdadeiros.",
      ],
    },
    {
      id: "servico",
      title: "O que o Let's Go Run é, e o que não é",
      paragraphs: [
        "O Let's Go Run sugere treinos de corrida a partir do seu perfil, da sua rotina, da sua triagem de saúde e dos seus registros. Ele não é serviço médico, de fisioterapia ou de nutrição, não faz diagnóstico e não substitui a orientação de profissionais de saúde ou de educação física.",
        "Antes de começar ou de aumentar a carga de treino, principalmente se você tem doença, lesão, restrição médica ou cirurgia recente, consulte um profissional. Interrompa o treino diante de dor que não passa, tontura, falta de ar fora do normal ou qualquer mal-estar. Em emergência (dor no peito que não passa, desmaio ou falta de ar intensa), ligue 192 (SAMU). Você decide se faz cada treino e como o faz, e responde por essa decisão.",
      ],
    },
    {
      id: "triagem",
      title: "Triagem de saúde",
      paragraphs: [
        "O app só monta treinos depois da triagem de saúde (questionário PAR-Q+). Dependendo das respostas, ele pede que você procure um profissional antes de treinar, e nenhum treino é gerado até lá.",
      ],
      items: [
        "Se você declarar uma avaliação profissional, o app registra a sua declaração, sem pedir documentos, e você responde pela veracidade do que declarou.",
        "Se a sua saúde mudar (novo diagnóstico, medicação, lesão, gravidez ou internação), informe quando o app perguntar ou em Configurações. A liberação deixa de valer e você refaz a triagem.",
        "A triagem tem prazo de validade e precisa ser refeita quando vencer.",
      ],
      after: [
        "O PAR-Q+ é de autoria da PAR-Q+ Collaboration (© PAR-Q+ Collaboration; tradução de Bianca Bold e Juliano Schwartz) e aparece sem alteração, com uso gratuito e não comercial.",
      ],
    },
    {
      id: "conta",
      title: "Sua conta",
      items: [
        "Guarde sua senha e não a compartilhe. Você é responsável pelo que acontece na sua conta.",
        'Avise se suspeitar de acesso indevido. Em Configurações, você pode encerrar as sessões abertas em outros aparelhos; para trocar a senha, use "Esqueci minha senha" na tela de entrada.',
        "Você pode excluir a conta a qualquer momento, em Configurações, e seus dados são apagados.",
      ],
    },
    {
      id: "uso-adequado",
      title: "Uso adequado",
      paragraphs: ["Não é permitido:"],
      items: [
        "tentar acessar dados de outras contas ou contornar a segurança do app;",
        "sobrecarregar o serviço ou usar meios automatizados que prejudiquem outros usuários;",
        "enviar textos ilegais, ofensivos ou que não sejam seus.",
      ],
      after: ["Podemos suspender contas que violem estas regras."],
    },
    {
      id: "seus-dados",
      title: "Seus dados e conteúdo",
      paragraphs: [
        "Os dados que você envia continuam sendo seus. Você nos autoriza a tratá-los só para operar o Let's Go Run para você, como descrito na Política de Privacidade.",
      ],
    },
    {
      id: "ciencia",
      title: "Treinos, regras e base científica",
      paragraphs: [
        "Os treinos vêm de regras de planejamento do app, baseadas em estudos citados em cada treino. Nenhuma inteligência artificial gera ou altera os treinos.",
        "Os estudos dão base geral a princípios de treinamento. Quando um valor é uma escolha inicial do app, sem estudo direto, o app informa. Estudos de grupos populacionais não garantem o mesmo resultado para você.",
      ],
    },
    {
      id: "gratuidade",
      title: "Gratuidade",
      paragraphs: ["O Let's Go Run é gratuito. Se isso mudar um dia, atualizaremos estes termos e avisaremos antes."],
    },
    {
      id: "disponibilidade",
      title: "Disponibilidade e mudanças",
      paragraphs: [
        "O Let's Go Run está em evolução e é oferecido como está. Pode ficar indisponível para manutenção ou por falha, e recursos podem mudar ou sair. Faremos o possível para avisar antes de mudanças que afetem seus dados.",
      ],
    },
    {
      id: "responsabilidade",
      title: "Responsabilidade",
      paragraphs: [
        "Dentro do que a lei permite, o Let's Go Run não garante resultados de desempenho ou de saúde, e não responde por lesões, danos ou perdas decorrentes do treino que você decidiu fazer. Nada aqui afasta direitos que a lei assegura a você, inclusive os do Código de Defesa do Consumidor.",
      ],
    },
    {
      id: "lei",
      title: "Lei aplicável",
      paragraphs: ["Valem as leis do Brasil. Se você for consumidor, o foro é o do seu domicílio."],
    },
    {
      id: "mudancas",
      title: "Mudanças e contato",
      paragraphs: [
        `Podemos atualizar estes termos; a data no topo mostra a versão em vigor, e avisamos no app quando a mudança for relevante. Dúvidas: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
