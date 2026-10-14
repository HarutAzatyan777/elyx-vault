# Սկզբնական Owner-ի մուտքի ստուգում — 2026-10-14

Իրական login-ը չի հաստատվել։ Production տվյալները չեն փոխվել, կանոնները չեն deploy արվել։

Օգտատիրոջ տրամադրած Auth UID՝ `GYBdG43Av6UqiXaK82WZwmgeXmv1`։ Տեղային `.env`-ը և `.firebaserc`-ը մատնանշում են `elyx-vault` նախագիծը։ Live կայքի օգտագործած նախագիծը դեռ պետք է համեմատել։ Այստեղ Firebase CLI-ի մուտքագրված հաշիվ և Application Default Credentials չեն հայտնաբերվել։ Միայն կարդացող Admin ստուգման փորձը ձախողվել է credentials-ի բացակայության պատճառով։ Auth UID-ի գոյությունը, disabled վիճակը, claims-ը և production Firestore գրառումները չեն հաստատվել։

## Հաստատված կոդային արդյունքներ

- Նախորդ HEAD-ի `useAuth.jsx`-ը email-ի `developerhar` հատվածով ստեղծում էր Owner կամ գոյություն ունեցող դերը փոխում Owner-ի։ Հին rules-ն էլ այդ հատվածը ընդունում էին որպես Owner։ Սա անվտանգ սեփականության ապացույց չէ։
- Նոր կոդն այդ արտոնությունը հանել է։ Այն ինքնուրույն չի ջնջում կամ նվազեցնում արդեն գոյություն ունեցող Owner գրառումը։ Սխալի պատճառը հենց այդ փոփոխությունն է՝ դեռ հաստատված չէ։
- Դերի և անդամակցության հեղինակավոր աղբյուրը `userAccess/{Firebase Auth UID}`-ն է։ Owner-ի համար պահանջվում են `role: "owner"`, `status: "active"`, ոչ դատարկ `businessId`։ Համապատասխան բիզնեսը ստուգվում է `businesses/{businessId}`-ում։ Միայն business գրառումը կամ email-ով invitation-ը Owner-ի ապացույց չեն։
- Առկա անվավեր անդամակցությունը չի վերականգնվում invitation-ի միջոցով։ Այլ UID-ով գրառումը չի ընդունվում։ Նույն email-ով ջնջված ու նորից ստեղծված Auth հաշվի UID-ը կարող է տարբերվել։
- Հավելվածն ու տեղային rules-ը Owner role-ի համար custom claims չեն պահանջում և դրանցով արտոնություն չեն շնորհում։ Claims-ի առկայությունն առանձին պետք է ստուգել, բայց դրանք չեն փոխարինում անդամակցությանը։
- Նշված «This account does not have active business access» հաղորդագրությունը հավելվածի authorization-ի մերժումն է։ Firestore-ի read/listener failure-ի համար այլ հաղորդագրություն է ցուցադրվում։ Live տարբերակը և հրապարակված rules-ը դեռ ստուգված չեն։
- Տեղային rules-ը թույլ են տալիս authenticated օգտատիրոջը կարդալ հենց իր `userAccess` գրառումը՝ նույնիսկ առանց active անդամակցության։ Protected business տվյալների համար անհրաժեշտ է active անդամակցություն նույն businessId-ով։

## Firebase Console-ում միայն կարդացող ստուգումներ

1. Բացել ճիշտ նախագիծը՝ նախ համեմատելով live կայքի Firebase projectId-ն։ Authentication → Users-ում գտնել ճշգրիտ `GYBdG43Av6UqiXaK82WZwmgeXmv1` UID-ը։ Ստուգել disabled վիճակը և sign-in provider-ը։ Email-ը կիրառել միայն հաշիվը նույնականացնելու համար։
2. Firestore Database → Data-ում բացել `userAccess/GYBdG43Av6UqiXaK82WZwmgeXmv1`։ Գրանցել գոյությունը, role-ը, status-ը և businessId-ն՝ չհրապարակելով գաղտնիքներ։ Document ID-ը պետք է ճշգրիտ համընկնի Auth UID-ին։
3. Բացել `businesses/{businessId}`-ը։ Համեմատել պատմական backup/audit log-ի կամ նախկին վստահելի provisioning գրառման հետ, որտեղ նշված են նույն UID-ը, Owner դերը և նույն բիզնեսը։ `invitedBy: "system"`-ը կամ հին email bootstrap-ը ինքնին բավարար ապացույց չեն։
4. Firestore → Rules-ում համեմատել հրապարակված կանոնները տեղային `firestore.rules`-ի հետ։ Այս աշխատանքը production կանոնները չի հրապարակել։ Ոչինչ չփոխել այս ստուգման ընթացքում։
5. Custom claims-ը ստուգել վստահելի Admin SDK-ի `getUser(uid)`-ով. Firebase Auth Users-ի սովորական Console էջը claims-ի խմբագրման գործիք չէ։ Ստորև գործիքը կարդում է միայն ընտրված authorization դաշտերը։ Admin read-ի հաջողությունը չի ապացուցում client rules-ի կամ իրական login-ի հաջողությունը։

Վստահելի միջավայրում, համապատասխան read IAM իրավունքներով և ADC-ով՝

```sh
node scripts/audit-owner-access.cjs elyx-vault GYBdG43Av6UqiXaK82WZwmgeXmv1
```

Գործիքը write API չի կանչում, email/token/ամբողջական documents չի տպում և միշտ նշում է `actualLoginVerified: false`։ Credentials-ը չտեղադրել repository-ում կամ browser-ում։

## Պայմանական մեկանգամյա վերականգնման ծրագիր

Միգրացիայի անհրաժեշտությունը դեռ հաստատված չէ։ Նախ պահանջվում են իրական գրառման արդյունքը և վստահելի պատմական ownership ապացույցը։ Եթե գրառումն արդեն վավեր է, միգրացիա չանել՝ ստուգել live project-ը, rules-ը, disabled Auth-ը և client permission-denied-ը։

Եթե ապացուցված նույն UID-ի անդամակցությունը բացակայում է կամ վնասված է, պատրաստել ճշգրիտ before/after փոփոխությունը միայն `userAccess/GYBdG43Av6UqiXaK82WZwmgeXmv1`-ի համար՝ `role: "owner"`, `status: "active"`, պատմականորեն հաստատված businessId։ Չօգտագործել `elyx-main-business`-ը որպես ավտոմատ ենթադրություն։ Պահպանել մնացած դաշտերը, timestamps-ը և բոլոր encrypted տվյալները։ Նոր գրառման email-ը, եթե անհրաժեշտ է, վերցնել նույն UID-ի Auth record-ից՝ որպես metadata, ոչ արտոնության հիմք։ Եթե Auth UID-ը տարբերվում է պատմական UID-ից, կանգ առնել՝ պահանջվում է հաշվի վերականգնման առանձին ապացույց և տվյալների տեղափոխման առանձին համաձայնություն։

Նախ արտահանել թիրախային գրառման backup-ը և առաջարկված փոփոխությունը ներկայացնել հաստատման։ Միայն explicit approval-ից հետո trusted Admin միջավայրում կատարել transaction՝ նախ ստուգելով, որ գրառումը չի փոխվել review-ից հետո (առկա փաստաթղթի updateTime կամ բացակայության precondition)։ Չստեղծել բիզնես, չփոխել claims, encryption keys կամ rules։ Console-ով ձեռքով edit-ը նույնպես production փոփոխություն է և պահանջում է նախնական հաստատում։

## Թեստեր և իրական մուտքի ընդունում

- `npx vitest run tests/auth.integration.test.jsx`՝ 9 թեստ անցել է։ Նոր դեպքերն ընդգրկում են active Owner-ի exact UID-ը, անվավեր status/businessId-ն և email/claims-ով վերականգնման մերժումը։
- `PATH=/tmp/elyx-jre21-arm/bin:$PATH npm run test:rules`՝ 10 emulator թեստ անցել է։ Նոր դեպքը ստուգում է Owner-ի business read-ը, self-profile inspection-ը և սխալ UID/email/claim-ի մերժումը։ Սրանք տեղային կանոնների թեստեր են։
- `node --check scripts/audit-owner-access.cjs` անցել է։ Production read փորձը ձախողվել է՝ իրական account inspection-ի արդյունք չկա։

Իրական ընդունման համար Owner-ը պետք է live կայքում նորից authenticate անի հենց նշված UID-ով, ստանա active Owner անդամակցություն և կարդա իր business-ի տվյալները client SDK-ով։ Ստուգել Owner-only UI գործողության իրավունքը առանց production տվյալ փոխելու, refresh-ից հետո մուտքի պահպանումը և Vault-ի կողպված մնալը մինչև ձեռքով unlock։ Չպահանջել օգտատիրոջ password, ID token կամ Vault master key։ Այդ ստուգումը դեռ չի կատարվել։
