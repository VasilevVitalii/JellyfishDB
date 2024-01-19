<div id="badges">
  <a href="https://www.linkedin.com/in/vasilev-vitalii/">
    <img src="https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.youtube.com/@user-gj9vk5ln5c/featured">
    <img src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Youtube Badge"/>
  </a>
</div>

# JellyfishDB
Embedded NoSQL "database", based on file storage.

## License
*MIT*
## Install
```
npm i jellyfishdb
```
## Example
```typescript
//in examples use property "key" in Person as primary key

export type TPerson = {key: string, login: string, email: string, country: string }
export type TPersonCache = {key: string, login: string, ddm: string }

//minimal
const driver1 = CreateDriver<TPerson,TPersonCache>({
    //required parameter
    getKeyFromPayload(payLoad) {
        return payLoad.key
    },
    //required parameter
    setKeyToPayload(payLoad, keyDefault) {
        payLoad.key = keyDefault
        return keyDefault
    }
})

```

