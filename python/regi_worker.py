import pandas as pd
import win32com.client as win32
import json
import sys
import os
from datetime import datetime

indices = json.loads(sys.argv[1])
csv_path = sys.argv[2]
template_path = sys.argv[3]
save_dir = sys.argv[4]

df = pd.read_csv(csv_path, encoding="utf-8")

try:
  hwp = win32.gencache.EnsureDispatch("HWPFrame.HWPObject")
  hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
  hwp.Open(template_path)
  
  # ... 기존 코드 응용 (df.iloc[index] 기반) ...
  for i in range(len(indices)):
    hwp.PutFieldText(f"name{str(i)}", df.loc[indices[i], "이름"])
    birthday = df.loc[indices[i], "주민등록번호"][0:6]
    birthtext = birthday[:2] + "." + birthday[2:4] + "." + birthday[4:]
    hwp.PutFieldText(f"birthday{str(i)}", birthtext)
    # 근무 시작일
    end_raw = df.loc[indices[i], "퇴사일"]
    if pd.isna(end_raw) or str(end_raw).strip() == "":
      # 신규
      startdate = df.loc[indices[i], "입사일"].replace("-", ".")
      hwp.PutFieldText(f"start_end_day{str(i)}", startdate)
      hwp.PutFieldText(f"new{str(i)}", "V")
    else:
      # 정지
      enddate = df.loc[indices[i], "퇴사일"].replace("-", ".")
      hwp.PutFieldText(f"start_end_day{str(i)}", enddate)
      hwp.PutFieldText(f"end{str(i)}", "V")
    if df.loc[indices[i], "직종"] == "rd":
      work = "영상의학과"
      job = "방사선사"
    elif df.loc[indices[i], "직종"] == "an":
      work = "수술실"
      job = "간호조무사"
    elif df.loc[indices[i], "직종"] == "rn":
      work = "수술실"
      job = "간호사"
    hwp.PutFieldText(f"work{str(i)}", work)
    hwp.PutFieldText(f"job{str(i)}", job)
    hwp.PutFieldText(f"license_n{str(i)}", df.loc[indices[i], "면허번호"])
  
  hwp.PutFieldText("regi_year", datetime.today().strftime("%Y"))
  hwp.PutFieldText("regi_month", datetime.today().strftime("%m"))
  hwp.PutFieldText("regi_day", datetime.today().strftime("%d"))
    
  save_path = os.path.join(save_dir, f"방사선관계종사자신고서_{datetime.today().strftime('%Y%m%d')}.hwp")
  hwp.SaveAs(save_path)
  print("방사선관계종사자신고서 작성완료")
  print("SUCCESS")

except Exception as e:
  print(f"오류 발생: {e}")
finally:
  try:
    hwp.Quit()
  except Exception as e:
    print(f"오류 발생: {e}")


    

  




  

