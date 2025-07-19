import { XMLParser } from '../libs/xml/XMLParser.js';
const xml = `<xml>
<ToUserName><![CDATA[gh_4a5640b38095]]></ToUserName>
<FromUserName><![CDATA[o4RbP6rqDYbXsyKUp9KTIylSyH6Y]]></FromUserName>
<CreateTime>1750626912</CreateTime>
<MsgType><![CDATA[event]]></MsgType>
<Event><![CDATA[SCAN]]></Event>
<EventKey><![CDATA[@1000#1750626902725#0]]></EventKey>
<Ticket><![CDATA[gQFU7jwAAAAAAAAAAS5odHRwOi8vd2VpeGluLnFxLmNvbS9xLzAyaVdaTGR4eG1mZkcxbTJQb05FY2EAAgRWclhoAwQsAQAA]]></Ticket>
<Encrypt><![CDATA[TMEWJWzyCqz8hzBMbe49hFxkbbHIX7QjKxRWmn5kizd/uqxc6jRu6kc0fo6aOxaC32OHH3c6lZZnp1kZMEnLShReaW/enJwAt1Vq900MvQIGUwmEmXMGkTB4iVppu9DPT9Ph7wHGdmP1h9FMNhyLIMoDgS6Y1qneemG91NRIDlTidpvlyLLZ68ikMgD29CzSELi1grRaKiCEPlF1iYOusCjSXg13sR1s1Fm/1sznOjfQUoyv7see3HeCRXq0+F0sBQU320afz81jTbALlh8eDAcHRH7VqZwa42B9K+kcuErqIQ15Gu+B/X+RvIjQIC+8m4qAoM1Xm5YxEBvIisGUDApPGSWQ7zr0aTh9XHjs9LWluoVH2R9EtkmsFTPEIdj7xa9JE17ivmqx9eFS5Z8QAskG2ldjD9UUrP1DybZHdZRpKLyeacXAAlBIAhhc1GoUvWXOQ+w8CurUPNFZUMplG8PP7ImxB11CLPSi6Hvu++M1YMbJ8Mg8ll59I/QeSaZE3BVCTFyOE5WCbtWPjPUT2Kp8kifG/L6yy3KhklCiV+kEsd76hqsLdk5WKyKmv0tGHYMPR+DrqZFPzEcswCDZT9ZO4lPnUSEZH37BM+som1GbCJ+g1FFC5QvpkVZNuN+x]]></Encrypt>
</xml>
`;
const json = new XMLParser().parse(xml);
console.log(json);
