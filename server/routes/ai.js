'use strict';
/**
 * AI 问答路由
 * - 默认：关键词匹配本地知识库（与 V2 行为一致，离线可用）
 * - 可选：配置 LLM_ENDPOINT + LLM_API_KEY 后，走真实大模型（DeepSeek / 内网 ai-hub 等），
 *   本地知识库作为兜底。回答返回时由前端统一转义，不存在 XSS。
 */
const express = require('express');
const router = express.Router();
const db = require('../store/db');

function keywordMatch(question, knowledge) {
  const q = (question || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const item of knowledge) {
    for (const kw of item.keywords || []) {
      if (q.includes(kw.toLowerCase())) {
        const score = kw.length;
        if (score > bestScore) { bestScore = score; best = item; }
      }
    }
  }
  return best ? { item: best, score: bestScore } : null;
}

async function callLLM(question, context) {
  const endpoint = process.env.LLM_ENDPOINT;
  const apiKey = process.env.LLM_API_KEY;
  if (!endpoint || !apiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是传发金融综管部的智能助手，回答要简洁、专业、基于给定资料。' },
          { role: 'user', content: `问题：${question}\n参考背景：${context || '（无）'}` }
        ],
        temperature: 0.3
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    return null;
  }
}

router.post('/query', async (req, res) => {
  const { question } = req.body || {};
  if (!question || !question.trim()) return res.status(400).json({ error: '请输入问题' });

  const knowledge = (db.get('aiKnowledge') || []);
  const hit = keywordMatch(question, knowledge);

  // 命中本地知识库：直接返回（带置信度）
  if (hit) {
    return res.json({
      matched: true,
      answer: hit.item.answer,
      source: '综管知识库',
      confidence: Math.min(95, 60 + hit.score * 5),
      engine: 'local'
    });
  }

  // 未命中：尝试真实大模型；失败则转人工
  const llmAnswer = await callLLM(question, '综管平台知识库未直接匹配，请基于常识与部门背景回答。');
  if (llmAnswer) {
    return res.json({ matched: true, answer: llmAnswer, source: 'AI 大模型', confidence: 70, engine: 'llm' });
  }
  return res.json({
    matched: false,
    answer: '抱歉，未在知识库中找到相关问题，且当前未配置大模型服务。已记录您的问题并转人工处理，请留意后续通知。',
    source: 'AI助手',
    confidence: 0,
    engine: 'fallback'
  });
});

module.exports = router;
