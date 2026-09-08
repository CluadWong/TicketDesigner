const data = {
  list: [
    {
      order: 1,
      txt: "断开220kV2251开关",
      type: "KG",
      deviceNum: "2251",
      stationNum: "1",
      action: {
        actType: "0",
        dstValue: "0",
        actValue: "0",
        actionName: "L",
        actionCHName: "断开",
      },
    },
    {
      order: 2,
      txt: "检查220kV2251开关确在合闸位置",
      type: "BSP",
      deviceNum: "2251",
      stationNum: "1",
    },
    {
      order: 3,
      txt: "合上220kV2251-7地刀",
      type: "DD",
      deviceNum: "2251-7",
      stationNum: "1",
      action: {
        actType: "0",
        dstValue: "1",
        actValue: "1",
        actionName: "H",
        actionCHName: "合上",
      },
    },
    {
      order: 4,
      txt: "检查220kV2251-7地刀确在分闸位置",
      type: "BSP",
      deviceNum: "2251-7",
      stationNum: "1",
    },
    {
      order: 5,
      txt: "合上220kV2251-67地刀",
      type: "DD",
      deviceNum: "2251-67",
      stationNum: "1",
      action: {
        actType: "0",
        dstValue: "1",
        actValue: "1",
        actionName: "H",
        actionCHName: "合上",
      },
    },
  ],
  image: [
    "https://www.baidu.com/img/PCtm_d9c8750bed0b3c7d089fa7d55720d6cf.png",
  ],
};
