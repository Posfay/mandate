// Name pools for procedurally generated (fictional) ministers, rivals and foreign leaders.
// Underscores become spaces. Format: [male first names, female first names, surnames]

const pool = (m, f, s) => ({ m: m.split(' '), f: f.split(' '), s: s.split(' ').map((x) => x.replace(/_/g, ' ')) });

export const NAMES = {
  USA: pool('James Michael Robert David William Daniel Marcus Anthony Kevin Jason Luis Brandon', 'Mary Jennifer Sarah Jessica Ashley Michelle Rachel Danielle Laura Maria Keisha Emily', 'Smith Johnson Williams Brown Miller Davis Garcia Rodriguez Wilson Anderson Thompson Moore Jackson Martin Walker Hall Carter Reyes Brooks Hayes'),
  GBR: pool('Oliver Thomas James Rory Callum Daniel Hamish Alistair Ben Owen Kwame Rhys', 'Charlotte Emma Sophie Rachel Bridget Priya Fiona Harriet Lucy Grace Niamh Imogen', 'Clarke Hughes Patel Davies Thornton Evans Murray Campbell Ashworth Whitmore Bennett Okafor Shaw Fraser Hale Lambert Pryce Lowther'),
  DEU: pool('Thomas Michael Stefan Andreas Jens Lars Matthias Florian Tobias Karl Jan Felix', 'Anna Katrin Julia Sabine Ricarda Claudia Franziska Lena Saskia Petra Johanna Miriam', 'Müller Schmidt Schneider Fischer Weber Wagner Becker Hoffmann Schulz Koch Richter Klein Wolf Neumann Braun Zimmermann Krüger Hartmann'),
  FRA: pool('Jean Pierre Nicolas Julien Thomas Antoine Gabriel Olivier Mathieu Laurent Karim Bruno', 'Marie Sophie Camille Claire Élisabeth Aurore Nathalie Agnès Julie Manon Léa Inès', 'Martin Bernard Dubois Durand Lefebvre Moreau Fournier Girard Mercier Rousseau Lambert Faure Chevalier Garnier Benali Roux Blanchard'),
  ITA: pool('Marco Luca Giuseppe Matteo Alessandro Andrea Francesco Paolo Giovanni Stefano Davide Roberto', 'Giulia Francesca Chiara Elena Sara Valentina Federica Paola Silvia Laura Daniela Martina', 'Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Costa Fontana Moretti'),
  ESP: pool('Pablo Alberto Javier Carlos Santiago Miguel Jorge Íñigo Fernando Gabriel Óscar Raúl', 'María Carmen Isabel Lucía Cristina Irene Teresa Ana Begoña Elena Marta Nerea', 'García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Álvarez Etxeberria Puig'),
  NLD: pool('Jan Pieter Mark Dilan Frans Sjoerd Henk Bram Ruben Jesse Thijs Koen', 'Sophie Femke Sigrid Lilian Esther Mona Anne Laura Fleur Ingrid Sanne Noor', 'de_Jong Jansen de_Vries van_den_Berg van_Dijk Bakker Visser Smit Meijer de_Boer Mulder Bos Vos Peters Hendriks Dekker Yilmaz'),
  SWE: pool('Erik Lars Anders Magnus Johan Per Mikael Karl Oskar Henrik Ali Gustav', 'Anna Maria Eva Karin Magdalena Ebba Johanna Elin Sara Linnea Ulla Amira', 'Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Lindqvist Berg Holm Lundgren Ek Sjöberg'),
  POL: pool('Piotr Krzysztof Tomasz Paweł Marcin Michał Jakub Andrzej Rafał Szymon Adam Bartosz', 'Anna Katarzyna Magdalena Agnieszka Joanna Małgorzata Barbara Ewa Dorota Aleksandra Monika Izabela', 'Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur Krawczyk Kaczmarek'),
  HUN: pool('László István József Zoltán Péter Gábor Tamás Attila András Balázs Dávid Bence', 'Anna Katalin Eszter Zsófia Judit Andrea Krisztina Ágnes Réka Dóra Orsolya Viktória', 'Nagy Kovács Tóth Szabó Horváth Varga Kiss Molnár Németh Farkas Balogh Papp Takács Juhász Lakatos Mészáros Simon Fekete'),
  TUR: pool('Mehmet Mustafa Ahmet Ali Hüseyin Hasan Murat Emre Burak Kemal Selim Can', 'Ayşe Fatma Zeynep Elif Emine Hatice Gülşen Derya Esra Canan Sevgi Deniz', 'Yılmaz Kaya Demir Şahin Çelik Yıldız Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Koç Kurt'),
  ZAF: pool('Thabo Sipho Themba Pieter Johan Mandla Bongani Kagiso Ahmed Ronald Fikile Lwazi', 'Naledi Lindiwe Thandi Nomvula Zanele Busisiwe Annelie Patricia Ayanda Precious Helen Refilwe', 'Dlamini Nkosi Ndlovu Khumalo Mokoena Botha van_der_Merwe Naidoo Mahlangu Zulu Molefe Pillay Venter Mthembu Sithole Jacobs'),
  IND: pool('Rahul Amit Arjun Vikram Rajesh Sanjay Arvind Suresh Anil Pranav Nitin Kiran', 'Priya Anjali Sunita Kavita Meera Lakshmi Nirmala Pooja Deepa Shweta Ritu Farah', 'Sharma Verma Patel Singh Gupta Reddy Iyer Nair Rao Kumar Joshi Mehta Chatterjee Yadav Das Menon Qureshi'),
  JPN: pool('Hiroshi Takeshi Kenji Taro Kazuo Daisuke Ryota Satoshi Masato Koichi Yuto Haruto', 'Yuko Akiko Tomomi Haruka Keiko Mariko Yoko Naomi Ayumi Emiko Rina Sakura', 'Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Matsumoto Inoue Kimura'),
  KOR: pool('Min-jun Ji-hoon Seung-min Dong-hyun Jae-won Sung-ho Hyun-woo Young-soo Jun-seo Kyung-ho Sang-woo Tae-hoon', 'Ji-yeon Seo-yeon Min-ji Hye-jin Eun-ji Soo-ah Ha-eun Yoon-hee Ji-woo Na-yeon Kyung-hwa Mi-sook', 'Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Oh Seo Shin Kwon Hwang'),
  AUS: pool('Jack Liam Angus Tim Josh Scott Peter Andrew Jason Kieran Matt Hamish', 'Penny Tanya Jacinta Clare Kate Bridget Anika Larissa Amanda Michelle Ellie Mia', 'Smith Jones Williams Brown Wilson Taylor Nguyen Kelly O’Brien Ryan Murphy Walsh Burke Thompson Russo Campbell'),
  CAN: pool('Pierre François Andrew Dominic Sean Liam Ethan Mathieu Gurpreet Noah Étienne Owen', 'Mélanie Anita Catherine Christine Leah Isabelle Sophie Ginette Jenny Rachel Amara Chloé', 'Tremblay Gagnon Roy Côté Bouchard Gauthier Morin Lavoie Fortin Smith Brown MacDonald Singh Wilson Leblanc Chen'),
  MEX: pool('José Juan Luis Carlos Ricardo Jorge Mario Andrés Alejandro Gerardo Emilio Raúl', 'María Guadalupe Rosa Alejandra Rocío Verónica Beatriz Mariana Ximena Paola Daniela Itzel', 'Hernández García Martínez López González Pérez Rodríguez Sánchez Ramírez Cruz Flores Gómez Morales Vázquez Reyes Ortega'),
  BRA: pool('João José Antônio Paulo Carlos Lucas Fernando Gabriel Guilherme Ricardo Rafael Thiago', 'Maria Ana Fernanda Juliana Simone Marina Patrícia Camila Luciana Tereza Beatriz Larissa', 'Silva Santos Oliveira Souza Rodrigues Ferreira Alves Pereira Lima Gomes Costa Ribeiro Martins Carvalho Almeida Lopes'),
  ARG: pool('Juan Martín Santiago Lucas Sergio Horacio Luis Facundo Patricio Guillermo Nicolás Tomás', 'María Victoria Patricia Cristina Sandra Florencia Carolina Diana Laura Elisa Mercedes Agustina', 'González Rodríguez Gómez Fernández López Díaz Martínez Pérez Romero Sosa Álvarez Torres Ruiz Sánchez Ramírez Acosta'),
};

// Cultures for world-actor leader turnover.
export const CULTURES = {
  anglo: NAMES.GBR, hispanic: NAMES.ESP, lusophone: NAMES.BRA, french: NAMES.FRA, german: NAMES.DEU,
  italian: NAMES.ITA, dutch: NAMES.NLD, nordic: NAMES.SWE, slavic: NAMES.POL, hungarian: NAMES.HUN,
  turkish: NAMES.TUR, turkic: NAMES.TUR, indian: NAMES.IND, japanese: NAMES.JPN, korean: NAMES.KOR,
  southafrican: NAMES.ZAF,
  latin: pool('Andrei Mihai Ion Alexandru Florin Radu', 'Elena Ioana Maria Andreea Alina Simona', 'Popescu Ionescu Popa Stan Dumitru Stoica Marin Constantin'),
  greek: pool('Giorgos Nikos Dimitris Kostas Yannis Alexis', 'Maria Eleni Katerina Sofia Dora Anna', 'Papadopoulos Georgiou Nikolaidis Konstantinou Dimitriou Pappas Karamanlis'),
  hebrew: pool('David Yosef Avi Moshe Eitan Yair', 'Tamar Noa Michal Yael Shira Orly', 'Cohen Levi Mizrahi Peretz Biton Friedman Shapiro'),
  persian: pool('Ali Reza Hossein Mehdi Mohammad Saeed', 'Fatemeh Maryam Zahra Narges Leila Shirin', 'Hosseini Ahmadi Rezaei Mohammadi Karimi Moradi Jafari'),
  arabic: pool('Mohammed Ahmed Khalid Omar Youssef Faisal', 'Fatima Aisha Mariam Layla Noura Huda', 'Al-Hassan Haddad Mansour Khalil Nasser Farouk Saleh'),
  westafrican: pool('Chinedu Emeka Babatunde Musa Ibrahim Oluwaseun', 'Ngozi Amina Funmilayo Chiamaka Zainab Adaeze', 'Okafor Adeyemi Bello Abubakar Okonkwo Eze Danjuma'),
  eastafrican: pool('Daniel Samuel Abebe Joseph Peter Mohamed', 'Grace Mercy Hirut Faith Wanjiru Selam', 'Kamau Otieno Mwangi Tesfaye Kiprop Haile Wekesa'),
  urdu: pool('Imran Bilal Asad Hamza Faisal Usman', 'Ayesha Sana Hina Mehwish Fatima Maryam', 'Khan Ahmed Malik Chaudhry Qureshi Butt Raza'),
  bengali: pool('Rahim Karim Tanvir Sabbir Arif Nasir', 'Nusrat Farzana Shirin Taslima Rumana Sadia', 'Rahman Hossain Islam Ahmed Chowdhury Uddin Sarker'),
  chinese: pool('Wei Jun Hao Ming Lei Jian', 'Li Mei Xin Hui Yan Ling', 'Wang Li Zhang Liu Chen Yang Huang Zhao'),
  indonesian: pool('Budi Agus Joko Rizky Andi Dimas', 'Siti Dewi Ratna Putri Indah Ayu', 'Santoso Wijaya Saputra Hidayat Kurniawan Setiawan Nugroho'),
  vietnamese: pool('Minh Tuan Hung Quang Duc Long', 'Lan Huong Mai Thu Linh Ngoc', 'Nguyen Tran Le Pham Hoang Phan Vu'),
  thai: pool('Somchai Anan Prasert Niran Wichai Kittisak', 'Siriporn Malee Kanya Ratana Nittaya Pim', 'Srisuk Chaiyaporn Wongsawat Saetang Thongchai Boonmee'),
  filipino: pool('Jose Juan Mark Paolo Ramon Miguel', 'Maria Ana Grace Kristine Angelica Joy', 'Santos Reyes Cruz Bautista Ocampo Garcia Mendoza'),
  malay: pool('Ahmad Muhammad Hafiz Azman Faizal Hakim', 'Nur Siti Aisyah Farah Aminah Zarina', 'Abdullah Ismail Hassan Rahman Osman Yusof'),
};
