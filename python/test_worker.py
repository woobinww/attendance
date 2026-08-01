
import pandas as pd
import win32com.client as win32
import json
import sys
import os
from datetime import datetime

def format_birthday(ssn):
    digits = "".join(ch for ch in str(ssn) if ch.isdigit())
    if len(digits) < 7:
        return ""

    birth = digits[:6]
    century_code = digits[6]
    century_prefix = "20" if century_code in ("3", "4", "7", "8") else "19"

    return f"{century_prefix}{birth[:2]}. {birth[2:4]}. {birth[4:6]}."

# --- 인자 받아오기 ---
# sys.argv[1] : 직원 index (int)
# sys.argv[2] : CSV 경로
# sys.argv[3] : 템플릿 경로
# sys.argv[4] : 저장 경로

try:
    indices = json.loads(sys.argv[1])
    worker_idx = indices[0]
    csv_path = sys.argv[2]
    template_path = sys.argv[3]
    save_dir = sys.argv[4]

    df = pd.read_csv(csv_path, encoding="utf-8")

    if worker_idx >= len(df):
        raise IndexError(f"지정한 index가 범위를 초과했습니다. 유효 범위: 0 ~ {len(df) - 1}")

    # 직원 정보 추출
    row = df.iloc[worker_idx]
    name = row["이름"]
    department = row["부서"]
    job_code = row["직종"]
    join_date = str(row["입사일"]).replace("-", ". ")
    birthday = format_birthday(row["주민등록번호"])

    # 직종명 매핑
    job_map = {
        "rd": "방사선사",
        "rn": "간호사",
        "an": "간호조무사"
    }
    job = job_map.get(job_code, "기타")

    # 날짜
    today = datetime.today()
    test_date_str = today.strftime("%Y. %m. %d")
    year = today.strftime("%Y")
    month = str(int(today.strftime("%m")))
    day = str(int(today.strftime("%d")))

    # --- HWP 작성 ---
    hwp = win32.gencache.EnsureDispatch("HWPFrame.HwpObject")
    hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
    hwp.Open(template_path)

    hwp.PutFieldText("work", department)
    hwp.PutFieldText("job", job)
    hwp.PutFieldText("name", name)
    hwp.PutFieldText("birthday", birthday)
    hwp.PutFieldText("start_day", join_date)
    hwp.PutFieldText("test_date", test_date_str)
    hwp.PutFieldText("test_year", year)
    hwp.PutFieldText("test_month", month)
    hwp.PutFieldText("test_day", day)

    # 저장
    save_path = os.path.join(save_dir, f"종사자건강진단표_{name}.hwp")
    hwp.SaveAs(save_path)
    print(f"건강진단표 작성 완료: {save_path}")
    print("SUCCESS")

except Exception as e:
    print(f"오류 발생: {e}")

finally:
    try:
        hwp.Quit()
    except:
        pass
