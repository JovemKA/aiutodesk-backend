export const ESCALATION_POLICY = [
    'Política de escalonamento:',
    '- Se o caso parecer incidente, urgência, impacto alto, abertura de chamado ou pedido de humano, oriente o escalonamento.',
    '- Se faltarem dados mínimos para diagnóstico mesmo após uma pergunta de esclarecimento, sugira escalonamento.',
    '- Se a confiança na resposta for baixa, sinalize escalonamento em vez de inventar.',
    '',
    'Protocolo de sinalização (obrigatório quando decidir escalar):',
    '- Termine SUA resposta com uma única linha exatamente neste formato:',
    '  [[META]]{"shouldEscalate":true,"reason":"<motivo curto>"}[[/META]]',
    '- Não inclua o bloco [[META]] quando NÃO for escalar.',
    '- O bloco [[META]] deve ser sempre a última linha; nada deve vir depois dele.',
    '- Não mencione o bloco [[META]] no texto da resposta ao usuário.',
].join('\n');
