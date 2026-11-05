"""Conteúdo do documento de entrega (Database Design · GS 2026.2).

Marcação simples nos textos: **negrito**, `código` e [n] para referências.
"""
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))

SOLUCAO = "Embarque Certo"
EQUIPE = "Embarque Certo"
INTEGRANTES = sorted([
    ("Vitor Rampazzi Franco", "562270"),
    ("Daniel Brito", "566236"),
    ("Gustavo Borsato", "5646211"),
])
DATA = "São Paulo · novembro de 2026"

COVER = {
    "inst": "FIAP · Engenharia de Software · 2º ano",
    "evento": "Global Solution 2026.2 · Desafio CitizenTech",
    "disciplina": "Database Design",
    "titulo": SOLUCAO,
    "subtitulo": "Lotação, atrasos e informação em tempo real para quem depende de trem, metrô e BRT",
}

FOOTER = f"{SOLUCAO} · Database Design · Global Solution 2026.2"


def _csv(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        rows = [r for r in csv.reader([ln for ln in f.read().splitlines() if ln.strip()])]
    return rows[0], rows[1:]


# ---------------------------------------------------------------------------
# Descrição das colunas (dicionário de dados)
# ---------------------------------------------------------------------------
DESC = {
    "T_EC_OPERADORA": {
        "id_operadora": "Identificador da operadora.",
        "nm_operadora": "Nome da operadora.",
        "sg_operadora": "Sigla usada no aplicativo.",
        "tp_gestao": "PUBLICA (empresa pública) ou CONCESSAO (concessionária privada).",
        "ds_site": "Site oficial da operadora.",
    },
    "T_EC_LINHA": {
        "id_linha": "Identificador da linha.",
        "id_operadora": "Operadora responsável pela linha.",
        "nr_linha": "Número oficial da linha (ex.: 3).",
        "nm_linha": "Nome da linha (ex.: Vermelha).",
        "tp_modal": "METRO, TREM, MONOTRILHO ou BRT.",
        "ds_cor_hex": "Cor oficial em hexadecimal, usada no aplicativo.",
    },
    "T_EC_ESTACAO": {
        "id_estacao": "Identificador da estação.",
        "nm_estacao": "Nome da estação.",
        "st_acessivel": "S quando a estação tem rota acessível completa (elevadores e rampas). Padrão S.",
        "nr_min_baldeacao": "Tempo médio, em minutos, para trocar de linha dentro da estação. Padrão 0.",
        "nr_latitude": "Latitude aproximada, para o mapa.",
        "nr_longitude": "Longitude aproximada, para o mapa.",
    },
    "T_EC_LINHA_ESTACAO": {
        "id_linha": "Linha.",
        "id_estacao": "Estação atendida pela linha.",
        "nr_ordem": "Posição da estação na linha (única por linha).",
        "nr_min_proxima": "Minutos até a próxima estação; NULL na última.",
    },
    "T_EC_USUARIO": {
        "id_usuario": "Identificador do passageiro.",
        "nm_usuario": "Nome do passageiro.",
        "ds_email": "E-mail de acesso, com formato validado.",
        "st_mobilidade_reduzida": "S para quem precisa de elevador ou rota acessível. Padrão N.",
        "nr_reputacao": "Confiabilidade dos relatos, de 0 a 100. Padrão 50.",
        "dt_cadastro": "Data do cadastro. Padrão SYSDATE.",
    },
    "T_EC_TIPO_OCORRENCIA": {
        "id_tipo_ocorrencia": "Identificador do tipo.",
        "nm_tipo": "Nome do tipo de ocorrência.",
        "ds_tipo": "Descrição do tipo.",
        "st_afeta_acessibilidade": "S quando o problema afeta quem tem mobilidade reduzida. Padrão N.",
    },
    "T_EC_OCORRENCIA": {
        "id_ocorrencia": "Identificador da ocorrência.",
        "id_tipo_ocorrencia": "Tipo da ocorrência.",
        "id_linha": "Linha afetada.",
        "id_estacao": "Estação afetada; NULL quando vale para a linha inteira.",
        "id_usuario": "Passageiro autor do relato; NULL em aviso oficial.",
        "tp_fonte": "USUARIO (relato) ou OPERADORA (aviso oficial).",
        "ds_ocorrencia": "Descrição do problema.",
        "nr_atraso_min": "Atraso estimado, em minutos (0 a 600). Padrão 0.",
        "st_ocorrencia": "ABERTA, CONFIRMADA, ENCERRADA ou DESCARTADA. Padrão ABERTA.",
        "dt_inicio": "Início do problema ou hora do relato. Padrão SYSDATE.",
        "dt_fim": "Normalização; obrigatória quando ENCERRADA ou DESCARTADA.",
    },
    "T_EC_CONFIRMACAO": {
        "id_ocorrencia": "Ocorrência avaliada.",
        "id_usuario": "Passageiro que avaliou.",
        "st_confirma": "S confirma; N informa que não está acontecendo. Padrão S.",
        "dt_confirmacao": "Data e hora da avaliação. Padrão SYSDATE.",
    },
    "T_EC_REGISTRO_LOTACAO": {
        "id_registro": "Identificador do registro.",
        "id_usuario": "Passageiro que informou.",
        "id_linha": "Linha da plataforma.",
        "id_estacao": "Estação.",
        "nr_nivel": "1 vazia · 2 tranquila · 3 moderada · 4 cheia · 5 superlotada.",
        "ds_sentido": "Sentido de circulação (estação terminal).",
        "dt_registro": "Data e hora do registro. Padrão SYSDATE.",
    },
    "T_EC_TRAJETO": {
        "id_trajeto": "Identificador do trajeto.",
        "id_usuario": "Passageiro dono do trajeto.",
        "id_estacao_origem": "Estação de partida.",
        "id_estacao_destino": "Estação de chegada (diferente da origem).",
        "nm_trajeto": "Apelido do trajeto, único por passageiro.",
        "hr_partida": "Horário habitual de partida (HH:MI).",
        "st_alerta_ativo": "S para receber alertas deste trajeto. Padrão S.",
    },
    "T_EC_ALERTA": {
        "id_trajeto": "Trajeto avisado.",
        "id_ocorrencia": "Ocorrência que gerou o alerta.",
        "tp_canal": "PUSH, SMS ou EMAIL. Padrão PUSH.",
        "st_lido": "S quando o passageiro abriu o alerta. Padrão N.",
        "dt_envio": "Data e hora do envio. Padrão SYSDATE.",
    },
}

BLOCO_TABELA = [
    ("Rede", "T_EC_OPERADORA", "Empresas que operam as linhas", 5),
    ("Rede", "T_EC_LINHA", "Linhas de metrô, trem e BRT", 6),
    ("Rede", "T_EC_ESTACAO", "Estações e tempo de baldeação", 15),
    ("Rede", "T_EC_LINHA_ESTACAO", "Estações de cada linha, em ordem, com os minutos até a próxima", 22),
    ("Informação", "T_EC_TIPO_OCORRENCIA", "Tipos de ocorrência", 6),
    ("Informação", "T_EC_OCORRENCIA", "Avisos oficiais e relatos dos passageiros", 12),
    ("Informação", "T_EC_CONFIRMACAO", "Confirmações e contestações de cada relato", 17),
    ("Informação", "T_EC_REGISTRO_LOTACAO", "Nível de lotação informado na plataforma", 20),
    ("Passageiro", "T_EC_USUARIO", "Passageiros (dados fictícios)", 8),
    ("Passageiro", "T_EC_TRAJETO", "Trajetos frequentes salvos", 8),
    ("Passageiro", "T_EC_ALERTA", "Alertas enviados aos trajetos afetados", 13),
]

# (pai, filho, coluna FK, leitura)
RELACOES = [
    ("T_EC_OPERADORA", "T_EC_LINHA", "id_operadora", "Uma operadora opera várias linhas; cada linha tem uma operadora."),
    ("T_EC_LINHA", "T_EC_LINHA_ESTACAO", "id_linha", "Uma linha passa por várias estações, em ordem."),
    ("T_EC_ESTACAO", "T_EC_LINHA_ESTACAO", "id_estacao", "Uma estação pode ser atendida por várias linhas (integração)."),
    ("T_EC_TIPO_OCORRENCIA", "T_EC_OCORRENCIA", "id_tipo_ocorrencia", "Cada ocorrência tem um tipo."),
    ("T_EC_LINHA", "T_EC_OCORRENCIA", "id_linha", "Toda ocorrência afeta uma linha."),
    ("T_EC_ESTACAO", "T_EC_OCORRENCIA", "id_estacao", "Opcional: sem estação, a ocorrência vale para a linha inteira."),
    ("T_EC_USUARIO", "T_EC_OCORRENCIA", "id_usuario", "Opcional: aviso oficial da operadora não tem passageiro autor."),
    ("T_EC_OCORRENCIA", "T_EC_CONFIRMACAO", "id_ocorrencia", "Uma ocorrência recebe várias confirmações."),
    ("T_EC_USUARIO", "T_EC_CONFIRMACAO", "id_usuario", "Um passageiro avalia várias ocorrências, uma vez cada."),
    ("T_EC_USUARIO", "T_EC_REGISTRO_LOTACAO", "id_usuario", "Um passageiro informa a lotação várias vezes."),
    ("T_EC_LINHA", "T_EC_REGISTRO_LOTACAO", "id_linha", "A lotação é medida na plataforma de uma linha..."),
    ("T_EC_ESTACAO", "T_EC_REGISTRO_LOTACAO", "id_estacao", "...em uma estação."),
    ("T_EC_USUARIO", "T_EC_TRAJETO", "id_usuario", "Um passageiro salva vários trajetos."),
    ("T_EC_ESTACAO", "T_EC_TRAJETO", "id_estacao_origem", "Estação de partida do trajeto."),
    ("T_EC_ESTACAO", "T_EC_TRAJETO", "id_estacao_destino", "Estação de chegada: a mesma tabela ligada duas vezes, com papéis diferentes."),
    ("T_EC_TRAJETO", "T_EC_ALERTA", "id_trajeto", "Um trajeto recebe vários alertas."),
    ("T_EC_OCORRENCIA", "T_EC_ALERTA", "id_ocorrencia", "Uma ocorrência gera alertas para vários trajetos."),
]

REFERENCIAS = [
    "METRÔ-SP. **Indicadores 2026** (dados de 2025). Portal da Transparência do Metrô de São Paulo. "
    "Disponível em: https://transparencia.metrosp.com.br/sites/default/files/Indicadores%20-%202026.pdf. Acesso em: nov. 2026.",
    "DIÁRIO DO TRANSPORTE. **Metrô de São Paulo transporta mais passageiros, bate recorde de satisfação, mas prejuízo dispara em 2025.** "
    "8 abr. 2026. Disponível em: https://diariodotransporte.com.br/2026/04/08/metro-de-sao-paulo-transporta-mais-passageiros-bate-recorde-de-satisfacao-mas-prejuizo-dispara-em-2025/. Acesso em: nov. 2026.",
    "REDE NOSSA SÃO PAULO; IPEC. **Viver em São Paulo: Mobilidade Urbana 2024.** Divulgação: JOVEM PAN, Tempo gasto no transporte público na cidade de São Paulo sobe para 2h47. "
    "Disponível em: https://jovempan.com.br/noticias/tempo-gasto-no-transporte-publico-na-cidade-de-sao-paulo-sobe-para-2h47/. Acesso em: nov. 2026.",
    "DGABC. **Em SP, Trivia Trens retoma de forma gradual operação das Linhas 11, 12 e 13.** 2026. "
    "Disponível em: https://www.dgabc.com.br/Noticia/4351419/em-sp-trivia-trens-retoma-de-forma-gradual-operacao-das-linhas-11-12-e-13. Acesso em: nov. 2026.",
    "NAÇÕES UNIDAS BRASIL. **Objetivos de Desenvolvimento Sustentável.** Disponível em: https://brasil.un.org/pt-br/sdgs. Acesso em: nov. 2026.",
    "ORACLE. **Oracle Database SQL Language Reference, 19c.** Disponível em: https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/. Acesso em: nov. 2026.",
]


def blocks():
    """Sequência de blocos do documento (depois da capa e do sumário)."""
    q1h, q1 = _csv("q1.csv")
    q2h, q2 = _csv("q2.csv")
    q3h, q3 = _csv("q3.csv")
    fmt_num = lambda v: v.replace(".", ",")  # noqa: E731

    b = []
    a = b.append

    # ------------------------------------------------------------------ 1
    a(("h1", "s1", "1. Apresentação do projeto"))
    a(("h2", "s1-1", "1.1 Contexto e problema"))
    a(("p", "Quem depende de trem, metrô e BRT na Região Metropolitana de São Paulo costuma planejar o dia sem saber "
            "o que vai encontrar. A rede é enorme: só o Metrô transportou 892,7 milhões de passageiros em 2025, cerca de "
            "3 milhões por dia útil [1][2]. E quem usa transporte público na capital gasta, em média, 2h47 por dia se "
            "deslocando [3]."))
    a(("p", "Quando um trem para, uma linha reduz a velocidade ou um elevador quebra, o passageiro em geral só descobre "
            "na plataforma lotada. A informação existe, mas está espalhada entre operadoras diferentes (Metrô, CPTM e "
            "concessionárias), cada uma com o seu canal, e muitas vezes chega tarde. Em 2026, por exemplo, a troca de "
            "operadora das linhas 11, 12 e 13 foi marcada por falhas, paralisações e idas e vindas sobre quem operava "
            "cada linha [4]."))
    a(("callout", "**Problema em uma frase:** o passageiro de trem, metrô e BRT não sabe, antes de sair de casa, se o "
                  "seu trajeto está com atraso, superlotação ou elevador fora de serviço. Por isso perde tempo, embarca "
                  "em trens lotados e, quando tem mobilidade reduzida, pode ficar sem acesso à estação."))

    a(("h2", "s1-2", "1.2 Ficha da CitizenTech"))
    a(("ficha", [
        ("Nome da CitizenTech", f"**{SOLUCAO}**"),
        ("Cidade e região", "São Paulo e Região Metropolitana. Piloto no eixo Zona Leste (Corinthians-Itaquera, "
                            "Tatuapé) → Centro (Brás, Sé, República, Luz) → Av. Paulista → Pinheiros e Berrini, além do "
                            "ABC (Santo André) pela Linha 10-Turquesa."),
        ("Cidadão beneficiado", "Quem depende de trem, metrô e BRT para trabalhar e estudar, principalmente moradores "
                                "das periferias, com viagens longas, e pessoas com mobilidade reduzida (idosos, pessoas "
                                "com deficiência, gestantes), que dependem de elevadores e escadas rolantes."),
        ("Problema, em uma frase", "Não saber, antes de sair, se o trajeto está com atraso, superlotação ou elevador "
                                   "parado."),
        ("Como funciona", "O aplicativo junta os avisos oficiais das operadoras e os relatos dos passageiros. Outros "
                          "passageiros confirmam ou desmentem cada relato. Quando uma ocorrência confirmada afeta um "
                          "trajeto salvo, o passageiro recebe um alerta e pode trocar de rota ou de horário."),
        ("Indicador de impacto", "Minutos de espera evitados por passageiro por semana; percentual de relatos "
                                 "confirmados em até 10 minutos; alertas de acessibilidade entregues antes da viagem. "
                                 "O banco já guarda os dados para medir os três (`T_EC_ALERTA`, `T_EC_CONFIRMACAO` e "
                                 "`T_EC_OCORRENCIA`)."),
        ("ODS conectados", "9, 10 e 11 (seção 1.6)."),
    ]))

    a(("h2", "s1-3", "1.3 Objetivo"))
    a(("p", f"Projetar e implementar no Oracle o banco de dados do **{SOLUCAO}**, aplicativo que reúne em um só lugar "
            "os avisos oficiais das operadoras e os relatos dos próprios passageiros sobre atrasos, trens parados, "
            "superlotação e elevadores ou escadas rolantes fora de serviço. O banco deve:"))
    a(("ol", [
        "guardar a rede de linhas e estações, com a ordem das estações e o tempo entre elas;",
        "registrar cada ocorrência e quem a confirmou ou desmentiu;",
        "acumular o nível de lotação informado por estação, linha e sentido;",
        "saber quais trajetos salvos são afetados por uma ocorrência, para avisar cada passageiro antes de ele sair "
        "de casa.",
    ]))

    a(("h2", "s1-4", "1.4 Escopo"))
    a(("scope", (
        "Dentro do escopo (piloto)", [
            "Rede do piloto: 5 operadoras, 6 linhas (1-Azul, 2-Verde, 3-Vermelha, 4-Amarela, 9-Esmeralda e "
            "10-Turquesa) e 15 estações de integração e grande movimento, com a ordem das estações e o tempo entre elas.",
            "Passageiros, com indicação de mobilidade reduzida e reputação dos relatos.",
            "Ocorrências (avisos oficiais e relatos), seus tipos, confirmações e contestações.",
            "Registros de lotação (nível de 1 a 5) por estação, linha e sentido.",
            "Trajetos frequentes e alertas enviados por push, SMS ou e-mail.",
        ],
        "Fora do escopo nesta entrega", [
            "Linhas de BRT e ônibus: a operadora do BRT-ABC já está cadastrada e o modelo aceita o modal BRT, mas as "
            "linhas entram na fase 2.",
            "Integração automática com os sistemas das operadoras: nesta entrega os dados são simulados.",
            "Compra de passagem e bilhetagem.",
            "Previsão de lotação com modelos estatísticos (parte da disciplina de Data Science).",
        ],
    )))

    a(("h2", "s1-5", "1.5 Principais funcionalidades"))
    a(("table", {
        "cols": ["Funcionalidade", "O que faz", "Tabelas"],
        "widths": [24, 52, 24],
        "class": "func",
        "rows": [
            ["**1. Situação das linhas agora**", "Painel com a situação de cada linha, juntando avisos oficiais e "
             "relatos confirmados. Linhas sem problema aparecem como “operação normal”.",
             "`T_EC_LINHA` `T_EC_OCORRENCIA`"],
            ["**2. Relato colaborativo**", "Em poucos toques, o passageiro informa atraso, trem parado, superlotação, "
             "elevador ou escada rolante fora de serviço, na linha inteira ou numa estação.",
             "`T_EC_OCORRENCIA` `T_EC_TIPO_OCORRENCIA`"],
            ["**3. Confirmação anti-boato**", "Outros passageiros confirmam ou desmentem o relato. Com duas "
             "confirmações ele vira CONFIRMADA; desmentido, vira DESCARTADA e a reputação do autor cai.",
             "`T_EC_CONFIRMACAO` `T_EC_USUARIO`"],
            ["**4. Termômetro de lotação**", "Nível de 1 a 5 por estação, linha e sentido, com ranking das estações "
             "mais cheias no horário de pico.", "`T_EC_REGISTRO_LOTACAO`"],
            ["**5. Trajetos e alertas**", "O passageiro salva trajetos e horários. Quando uma ocorrência confirmada "
             "afeta o caminho, recebe alerta por push, SMS ou e-mail.", "`T_EC_TRAJETO` `T_EC_ALERTA`"],
            ["**6. Acessibilidade em primeiro lugar**", "Quem tem mobilidade reduzida é avisado de elevadores e "
             "escadas fora de serviço nas estações do seu trajeto.",
             "`T_EC_USUARIO` `T_EC_ESTACAO` `T_EC_TIPO_OCORRENCIA`"],
            ["**7. Base para a rota inteligente**", "A rede fica guardada como um grafo: ordem das estações, minutos "
             "entre elas e tempo de baldeação. Com atrasos e lotação, o algoritmo da disciplina de Dynamic "
             "Programming calcula a melhor rota.", "`T_EC_LINHA_ESTACAO` `T_EC_ESTACAO`"],
        ],
    }))

    a(("h2", "s1-6", "1.6 Conexão com os ODS"))
    a(("table", {
        "cols": ["ODS", "Meta", "Como o Embarque Certo contribui"],
        "widths": [20, 38, 42],
        "class": "ods",
        "rows": [
            ["**ODS 11** · Cidades e comunidades sustentáveis",
             "11.2 · Acesso a sistemas de transporte seguros, acessíveis e sustentáveis para todos, com atenção às "
             "pessoas em situação de vulnerabilidade, pessoas com deficiência e idosos.",
             "Informação confiável para planejar a viagem e alertas de elevador ou escada fora de serviço para quem "
             "tem mobilidade reduzida."],
            ["**ODS 9** · Indústria, inovação e infraestrutura",
             "9.1 · Infraestrutura de qualidade, confiável e resiliente, com acesso equitativo para todos.",
             "O histórico de ocorrências e de lotação mostra onde e quando a rede falha, e ajuda operadoras e poder "
             "público a priorizar melhorias."],
            ["**ODS 10** · Redução das desigualdades",
             "10.2 · Inclusão social de todos, independentemente da idade ou da deficiência.",
             "Quem mora mais longe e quem tem mobilidade reduzida é quem mais perde com a falta de informação; o "
             "aplicativo dá a essas pessoas o mesmo aviso antecipado."],
        ],
    }))

    # ------------------------------------------------------------------ 2
    a(("h1", "s2", "2. Modelo de dados"))
    a(("h2", "s2-1", "2.1 Visão geral"))
    a(("p", "O modelo relacional tem **11 tabelas** em três blocos, com as mesmas cores usadas no diagrama: a **rede** "
            "(operadoras, linhas e estações), a **informação em tempo real** (ocorrências, confirmações e lotação) e o "
            "**passageiro** (cadastro, trajetos e alertas)."))
    rows = [[blk, f"`{t}`", txt, str(n)] for blk, t, txt, n in BLOCO_TABELA]
    rows.append(["", "", "**Total de registros na carga de exemplo**", "**132**"])
    a(("table", {"cols": ["Bloco", "Tabela", "O que guarda", "Linhas"], "widths": [14, 33, 43, 10],
                 "class": "overview", "rows": rows, "align": {3: "right"}}))
    a(("p", "**Padrão de nomes.** Tabelas `T_EC_<NOME>` (EC = Embarque Certo). Colunas com prefixo que indica o "
            "conteúdo: `id_` identificador, `nm_` nome, `ds_` descrição, `dt_` data e hora, `nr_` número, `st_` "
            "situação, `tp_` tipo, `sg_` sigla e `hr_` horário. Constraints com prefixo `PK_`, `FK_`, `UN_` e `CK_`."))

    a(("figure", {
        "id": "s2-2",
        "title": "2.2 Diagrama do modelo lógico",
        "caption": "Figura 1 – Modelo lógico relacional do Embarque Certo: 11 tabelas, atributos com tipo de dado, "
                   "chaves primárias (PK), estrangeiras (FK) e únicas (UK), e os 17 relacionamentos com a "
                   "cardinalidade em notação pé de galinha.",
    }))

    a(("h2", "s2-3", "2.3 Relacionamentos e cardinalidades"))
    a(("p", "Cada relacionamento é implementado por uma chave estrangeira na tabela filha. Na coluna de cardinalidade, "
            "o primeiro número é o lado pai e o segundo, o lado filho: **1 : N** quer dizer que cada registro filho "
            "aponta para exatamente um pai, e um pai pode ter zero ou muitos filhos; **0..1 : N** indica chave "
            "estrangeira opcional."))
    a(("relations", None))
    a(("p", "Três relacionamentos muitos-para-muitos foram resolvidos com **tabelas associativas**, cuja chave primária "
            "é composta pelas duas chaves estrangeiras: LINHA × ESTACAO (`T_EC_LINHA_ESTACAO`), USUARIO × OCORRENCIA "
            "(`T_EC_CONFIRMACAO`) e TRAJETO × OCORRENCIA (`T_EC_ALERTA`). A chave composta impede, por exemplo, que o "
            "mesmo passageiro confirme a mesma ocorrência duas vezes."))

    a(("h2", "s2-4", "2.4 Regras de negócio garantidas pelo banco"))
    a(("ul", [
        "**Identidade e unicidade:** chave primária nas 11 tabelas e 8 chaves únicas: e-mail do passageiro, nome e "
        "sigla da operadora, número da linha, nome da estação, nome do tipo de ocorrência, posição da estação na "
        "linha (linha + ordem) e apelido do trajeto por passageiro.",
        "**Integridade referencial:** 17 chaves estrangeiras impedem ocorrências, lotações, trajetos ou alertas que "
        "apontem para registros inexistentes.",
        "**Domínios (CHECK):** campos S/N; gestão (PUBLICA ou CONCESSAO); modal (METRO, TREM, MONOTRILHO ou BRT); "
        "situação da ocorrência; fonte (USUARIO ou OPERADORA); canal (PUSH, SMS ou EMAIL); nível de lotação de 1 a 5; "
        "reputação de 0 a 100; atraso de 0 a 600 minutos; latitude e longitude válidas; e-mail com formato válido; "
        "horário no formato HH:MI (expressão regular).",
        "**Regras entre colunas:** `ck_ec_ocorrencia_autor` (relato de passageiro precisa de autor; aviso oficial "
        "não pode ter); `ck_ec_ocorrencia_fim` (ocorrência ativa não tem fim; encerrada ou descartada precisa ter, e "
        "o fim não pode ser anterior ao início); `ck_ec_trajeto_estacoes` (origem diferente do destino).",
        "**Valores padrão:** data e hora atuais (SYSDATE) nos registros, situação inicial ABERTA, reputação inicial "
        "50 e alerta não lido.",
    ]))
    a(("p", "Regras que dependem de outras tabelas ficam na aplicação: verificar se a estação informada pertence à "
            "linha (consulta em `T_EC_LINHA_ESTACAO`), impedir que o autor confirme o próprio relato, mudar a "
            "ocorrência para CONFIRMADA ao atingir duas confirmações e só enviar alertas de ocorrências confirmadas. "
            "Essa última regra aparece nos dados: a ocorrência 10, ainda ABERTA, não gerou nenhum alerta."))

    a(("h2", "s2-5", "2.5 Normalização"))
    a(("p", "O modelo está na terceira forma normal (3FN):"))
    a(("ul", [
        "**1FN:** todos os atributos são atômicos e não há grupos repetidos. As estações de uma linha, por exemplo, "
        "ficam em registros separados de `T_EC_LINHA_ESTACAO`, e não numa lista dentro de `T_EC_LINHA`.",
        "**2FN:** nas tabelas de chave composta, os atributos dependem da chave inteira: a ordem e o tempo até a "
        "próxima estação dependem do par linha + estação; a decisão e a data de uma confirmação, do par ocorrência + "
        "passageiro; canal, leitura e envio de um alerta, do par trajeto + ocorrência.",
        "**3FN:** não há dependência transitiva. Os dados da operadora ficam em `T_EC_OPERADORA` e não se repetem em "
        "cada linha; a descrição do tipo fica em `T_EC_TIPO_OCORRENCIA`. Valores calculáveis, como a situação atual "
        "de cada linha ou a lotação média de uma estação, não são gravados: saem de consultas (seção 3).",
    ]))

    # ------------------------------------------------------------------ 3
    a(("h1", "s3", "3. Scripts SQL entregues"))
    a(("h2", "s3-1", "3.1 Arquivos e ordem de execução"))
    a(("table", {
        "cols": ["Arquivo", "Conteúdo", "Resultado no teste"],
        "widths": [27, 43, 30],
        "class": "files",
        "rows": [
            ["`01_DDL_EmbarqueCerto.sql`", "Bloco que remove as tabelas do projeto se já existirem; 11 CREATE TABLE "
             "com PK, UK e CHECK nomeadas; 17 ALTER TABLE ADD CONSTRAINT com as chaves estrangeiras; comentários nas "
             "tabelas.", "11 tabelas e 17 chaves estrangeiras criadas, sem erros. Pode ser executado de novo."],
            ["`02_DML_EmbarqueCerto.sql`", "Limpeza das tabelas (DELETE na ordem inversa das FKs) e 132 INSERT com "
             "dados de exemplo, seguidos de COMMIT.", "132 linhas inseridas; todas as tabelas com 5 linhas ou mais, "
             "sem exceções a justificar."],
            ["`03_DQL_EmbarqueCerto.sql`", "As três consultas pedidas, comentadas (seções 3.2 a 3.4).",
             "10, 9 e 5 linhas retornadas."],
        ],
    }))
    a(("p", "**Como executar:** no Oracle SQL Developer, conectado ao servidor Oracle da FIAP, abra cada arquivo na "
            "ordem da tabela e use **Executar Script (F5)**. Os scripts foram testados no Oracle Database XE 21c e "
            "usam apenas recursos disponíveis no Oracle 19c. No teste, 10 tentativas de gravar dados inválidos (relato "
            "sem autor, ocorrência encerrada sem data de fim, horário 25:00, e-mail inválido, nível de lotação 6, "
            "linha inexistente, entre outras) foram todas barradas pelas constraints."))
    a(("p", "**Origem dos dados:** linhas, estações, operadoras e cores seguem a rede real de metrô e trem da Região "
            "Metropolitana de São Paulo (informação pública); tempos entre estações, coordenadas e acessibilidade são "
            "aproximados. Passageiros, relatos, confirmações, lotação, trajetos e alertas são **simulados**: nenhum "
            "dado pessoal real foi usado (e-mails no domínio reservado example.com)."))

    a(("h2", "s3-2", "3.2 Consulta 1 · INNER JOIN"))
    a(("p", "**Pergunta:** o que aconteceu em cada estação, da ocorrência mais recente para a mais antiga? A consulta "
            "une `T_EC_OCORRENCIA` e `T_EC_ESTACAO` pela coluna `id_estacao`. As ocorrências que valem para a linha "
            "inteira (sem estação) não aparecem, porque o INNER JOIN só devolve registros com correspondência nas duas "
            "tabelas."))
    a(("sql", "SELECT e.nm_estacao, o.id_ocorrencia, o.ds_ocorrencia, o.st_ocorrencia, o.nr_atraso_min, o.dt_inicio\n"
              "  FROM t_ec_ocorrencia o\n"
              " INNER JOIN t_ec_estacao e ON e.id_estacao = o.id_estacao\n"
              " ORDER BY o.dt_inicio DESC;"))
    a(("table", {"cols": ["Estação", "Nº", "Descrição", "Situação", "Atraso", "Início"],
                 "widths": [14, 5, 43, 13, 7, 18], "class": "result",
                 "rows": [[r[0], r[1], r[2], r[3], r[4], r[5]] for r in q1], "align": {1: "right", 4: "right"},
                 "caption": f"Resultado da consulta 1 ({len(q1)} linhas)."}))

    a(("h2", "s3-3", "3.3 Consulta 2 · INNER JOIN com funções de grupo e GROUP BY"))
    a(("p", "**Pergunta:** quais estações ficam mais lotadas no pico da manhã (registros entre 06h00 e 09h59)? A "
            "consulta une `T_EC_ESTACAO` e `T_EC_REGISTRO_LOTACAO`, agrupa por estação e calcula **COUNT** "
            "(quantidade de registros), **AVG** (nível médio) e **MAX** (pior nível)."))
    a(("sql", "SELECT e.nm_estacao, COUNT(r.id_registro) AS qt_registros,\n"
              "       ROUND(AVG(r.nr_nivel), 2) AS nivel_medio, MAX(r.nr_nivel) AS nivel_maximo\n"
              "  FROM t_ec_estacao e\n"
              " INNER JOIN t_ec_registro_lotacao r ON r.id_estacao = e.id_estacao\n"
              " WHERE TO_NUMBER(TO_CHAR(r.dt_registro, 'HH24')) BETWEEN 6 AND 9\n"
              " GROUP BY e.nm_estacao\n"
              " ORDER BY nivel_medio DESC, qt_registros DESC, e.nm_estacao;"))
    a(("table", {"cols": ["Estação", "Registros", "Nível médio", "Nível máximo"], "widths": [40, 20, 20, 20],
                 "class": "result narrow",
                 "rows": [[r[0], r[1], fmt_num(r[2]), r[3]] for r in q2],
                 "align": {1: "right", 2: "right", 3: "right"},
                 "caption": f"Resultado da consulta 2 ({len(q2)} linhas)."}))
    a(("p", "**Leitura:** Corinthians-Itaquera e Tatuapé, na Linha 3-Vermelha sentido centro, são os pontos mais "
            "críticos da manhã. É ali que o aplicativo deve priorizar alertas e sugerir horários ou rotas alternativas."))

    a(("h2", "s3-4", "3.4 Consulta 3 · LEFT OUTER JOIN com WHERE e ORDER BY"))
    a(("p", "**Pergunta:** qual é a situação agora de cada linha de metrô? A consulta parte de `T_EC_LINHA` e traz, com "
            "LEFT OUTER JOIN, as ocorrências ativas de `T_EC_OCORRENCIA`. O filtro de situação (ABERTA ou CONFIRMADA) "
            "fica na cláusula ON para não eliminar as linhas sem ocorrência, que aparecem como “Operação normal”. O "
            "**WHERE** seleciona só o modal METRO e o **ORDER BY** classifica pelo número da linha e pelo maior "
            "atraso."))
    a(("sql", "SELECT l.nr_linha, l.nm_linha, NVL(o.st_ocorrencia, 'NORMAL') AS situacao,\n"
              "       NVL(o.ds_ocorrencia, 'Operação normal') AS detalhe, NVL(o.nr_atraso_min, 0) AS atraso_min\n"
              "  FROM t_ec_linha l\n"
              "  LEFT OUTER JOIN t_ec_ocorrencia o\n"
              "    ON o.id_linha = l.id_linha AND o.st_ocorrencia IN ('ABERTA', 'CONFIRMADA')\n"
              " WHERE l.tp_modal = 'METRO'\n"
              " ORDER BY l.nr_linha, atraso_min DESC;"))
    a(("table", {"cols": ["Linha", "Nome", "Situação", "Detalhe", "Atraso"], "widths": [8, 13, 15, 55, 9],
                 "class": "result", "rows": [[r[0], r[1], r[2], r[3], r[4]] for r in q3],
                 "align": {0: "right", 4: "right"},
                 "caption": f"Resultado da consulta 3 ({len(q3)} linhas)."}))
    a(("p", "**Leitura:** as linhas 1-Azul e 2-Verde só aparecem graças ao LEFT OUTER JOIN. Com INNER JOIN, o painel "
            "esconderia justamente as linhas que estão funcionando bem."))

    # ------------------------------------------------------------------ apêndice
    a(("h1", "apA", "Apêndice A · Dicionário de dados"))
    a(("p", "Gerado a partir do catálogo do Oracle (`USER_TAB_COLUMNS` e `USER_CONSTRAINTS`) depois da execução do "
            "script DDL. Na coluna Nulo, **N** indica NOT NULL."))
    a(("dictionary", None))

    a(("h1", "refs", "Referências"))
    a(("refs", REFERENCIAS))
    return b
